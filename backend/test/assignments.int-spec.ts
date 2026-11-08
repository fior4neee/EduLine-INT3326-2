import { Course, Lesson, User } from '@prisma/client';
import { OutboxProcessor } from '../src/events/outbox-processor.service';
import { AssignmentRemindersService } from '../src/modules/assignments/assignment-reminders.service';
import { createTestApp, enroll, makeCourse, makeUser, resetDatabase, TestApp } from './helpers/app';

// Phase 2 of docs/m2-plan.md: assignments, text submissions, grading,
// submission comments, due-soon reminders and their notifications.
describe('assignments', () => {
  let t: TestApp;
  let outbox: OutboxProcessor;
  let reminders: AssignmentRemindersService;
  let instructor: User;
  let student: User;
  let course: Course;
  let lessons: Lesson[];
  let asInstructor: { Authorization: string };
  let asStudent: { Authorization: string };

  const HOUR = 60 * 60 * 1000;
  const api = (path: string) => `/api/v1${path}`;

  beforeAll(async () => {
    t = await createTestApp();
    outbox = t.app.get(OutboxProcessor);
    reminders = t.app.get(AssignmentRemindersService);
  });
  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    instructor = await makeUser(t.prisma, 'Instructor');
    student = await makeUser(t.prisma);
    // A Text lesson as well, so submitting the assignment does not complete the course.
    ({ course, lessons } = await makeCourse(t.prisma, instructor, ['Text']));
    await enroll(t.prisma, student, course.id);
    asInstructor = { Authorization: `Bearer ${await t.tokenFor(instructor)}` };
    asStudent = { Authorization: `Bearer ${await t.tokenFor(student)}` };
  });

  const create = (body: object = {}) =>
    t
      .http()
      .post(api(`/modules/${lessons[0].moduleId}/assignments`))
      .set(asInstructor)
      .send({ title: 'Bài tập 1', instructions: 'Viết một đoạn văn.', ...body });
  const createPublished = async (body: object = {}) => {
    const a = (await create(body).expect(201)).body;
    await t.http().post(api(`/assignments/${a.id}/publish`)).set(asInstructor).expect(200);
    return a;
  };
  const submit = (id: string, textBody = 'Bài làm của em.', who = asStudent) =>
    t.http().post(api(`/assignments/${id}/submissions`)).set(who).send({ textBody });
  const notificationsOf = async (auth: { Authorization: string }) => {
    await outbox.processPending();
    return (await t.http().get(api('/notifications')).set(auth).expect(200)).body.data as Array<{
      type: string;
      title: string;
      messageBody: string;
      groupKey: string | null;
      actionUrl: string;
    }>;
  };

  it('AS01: creating adds an Assignment lesson; drafts are invisible to students', async () => {
    const res = await create({ allowedExtensions: ['.PDF', 'docx'], submissionTypes: ['FileUpload'] }).expect(201);
    expect(res.body).toMatchObject({
      isPublished: false,
      allowedExtensions: ['.pdf', '.docx'],
      submissionTypes: ['FileUpload'],
      allowLateSubmissions: true,
      maxPoints: 100,
    });
    const lesson = await t.prisma.lesson.findFirstOrThrow({ where: { type: 'Assignment' } });
    expect(res.body.lessonId).toBe(`les_${lesson.id}`);

    await t.http().get(api(`/assignments/${res.body.id}`)).set(asStudent).expect(404);
    const list = await t.http().get(api(`/courses/${course.id}/assignments`)).set(asStudent).expect(200);
    expect(list.body).toEqual([]);
    await create({ allowedExtensions: ['../x'] }).expect(400);
  });

  it('AS02: publishing notifies Active students once, except those who chose "Denied"', async () => {
    const denied = await makeUser(t.prisma);
    await enroll(t.prisma, denied, course.id);
    await t.prisma.notificationSubscription.create({
      data: { userId: denied.id, courseId: course.id, status: 'Denied' },
    });
    const a = await createPublished({ dueAt: new Date(Date.now() + 72 * HOUR) });
    await t.http().post(api(`/assignments/${a.id}/publish`)).set(asInstructor).expect(200); // again

    const mine = await notificationsOf(asStudent);
    expect(mine.filter((n) => n.type === 'AssignmentPublished')).toHaveLength(1);
    expect(mine[0].title).toBe('Bài tập mới: Bài tập 1');
    expect(mine[0].actionUrl).toBe(`/courses/${course.slug}/lessons/${a.lessonId}`);
    const deniedToken = { Authorization: `Bearer ${await t.tokenFor(denied)}` };
    expect(await notificationsOf(deniedToken)).toHaveLength(0);
  });

  it('AS03: a text submission completes the lesson; resubmitting replaces it', async () => {
    const a = await createPublished();
    const first = await submit(a.id).expect(201);
    expect(first.body).toMatchObject({ textBody: 'Bài làm của em.', status: 'Submitted', isLate: false, fileName: null });

    const progress = await t.http().get(api(`/courses/${course.id}/progress/me`)).set(asStudent).expect(200);
    expect(progress.body.completedLessonIds).toContain(a.lessonId);

    const second = await submit(a.id, 'Bản sửa.').expect(201);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.textBody).toBe('Bản sửa.');
    const view = await t.http().get(api(`/assignments/${a.id}`)).set(asStudent).expect(200);
    expect(view.body).toMatchObject({ submissionState: 'Submitted', submitBlockedReason: null });
    expect(view.body.mySubmission.textBody).toBe('Bản sửa.');
  });

  it('AS04: text is refused when the instructor only accepts files', async () => {
    const a = await createPublished({ submissionTypes: ['FileUpload'], allowedExtensions: ['.pdf'] });
    const res = await submit(a.id).expect(422);
    expect(res.body.error.code).toBe('SUBMISSION_TYPE_NOT_ALLOWED');
  });

  it('AS05: after the due date work is late when allowed, refused when not', async () => {
    const pastDue = new Date(Date.now() - HOUR);
    const lateOk = await createPublished({ dueAt: pastDue });
    expect((await submit(lateOk.id).expect(201)).body.isLate).toBe(true);
    const view = await t.http().get(api(`/assignments/${lateOk.id}`)).set(asStudent).expect(200);
    expect(view.body.submissionState).toBe('Late');

    const strict = await createPublished({ title: 'Nghiêm ngặt', dueAt: pastDue, allowLateSubmissions: false });
    expect((await submit(strict.id).expect(422)).body.error.code).toBe('ASSIGNMENT_CLOSED');
    const strictView = await t.http().get(api(`/assignments/${strict.id}`)).set(asStudent).expect(200);
    expect(strictView.body).toMatchObject({ submissionState: 'Missing', submitBlockedReason: 'ASSIGNMENT_CLOSED' });
  });

  it('AS06: before unlockAt students see the title only and cannot submit', async () => {
    const a = await createPublished({ unlockAt: new Date(Date.now() + 2 * HOUR) });
    const view = await t.http().get(api(`/assignments/${a.id}`)).set(asStudent).expect(200);
    expect(view.body).toMatchObject({ locked: true, instructions: null, submitBlockedReason: 'ASSIGNMENT_NOT_OPEN' });
    expect((await submit(a.id).expect(422)).body.error.code).toBe('ASSIGNMENT_NOT_OPEN');
    await create({ unlockAt: new Date(Date.now() + 2 * HOUR), dueAt: new Date(Date.now() + HOUR) }).expect(422);
  });

  it('AS07: grading notifies the student with the score; a graded submission cannot be replaced', async () => {
    const a = await createPublished({ maxPoints: 10 });
    const sub = (await submit(a.id).expect(201)).body;
    await t.http().patch(api(`/submissions/${sub.id}/grade`)).set(asInstructor).send({ score: 11 }).expect(422);
    const graded = await t
      .http()
      .patch(api(`/submissions/${sub.id}/grade`))
      .set(asInstructor)
      .send({ score: 9, feedback: 'Tốt lắm' })
      .expect(200);
    expect(graded.body).toMatchObject({ status: 'Graded', score: 9, gradedById: instructor.id });

    const note = (await notificationsOf(asStudent)).find((n) => n.type === 'AssignmentGraded');
    expect(note?.messageBody).toBe('Điểm của bạn: 9/10. Nhận xét: "Tốt lắm"');
    expect((await submit(a.id).expect(422)).body.error.code).toBe('ALREADY_GRADED');
  });

  it('AS08: the gradebook lists every student, including Missing ones', async () => {
    const other = await makeUser(t.prisma);
    await enroll(t.prisma, other, course.id);
    const a = await createPublished({ dueAt: new Date(Date.now() + HOUR) });
    await submit(a.id).expect(201);
    await t.prisma.assignment.updateMany({ data: { dueAt: new Date(Date.now() - HOUR) } });

    const book = await t.http().get(api(`/assignments/${a.id}/submissions`)).set(asInstructor).expect(200);
    const states = Object.fromEntries(
      book.body.data.map((r: { student: { id: string }; submissionState: string }) => [r.student.id, r.submissionState]),
    );
    expect(states).toEqual({ [student.id]: 'Submitted', [other.id]: 'Missing' });
    await t.http().get(api(`/assignments/${a.id}/submissions`)).set(asStudent).expect(403);
  });

  it('AS09: comments notify the other side only; outsiders get 404', async () => {
    const a = await createPublished();
    const sub = (await submit(a.id).expect(201)).body;
    await t.http().post(api(`/submissions/${sub.id}/comments`)).set(asStudent).send({ body: 'Thầy xem giúp em' }).expect(201);
    await t.http().post(api(`/submissions/${sub.id}/comments`)).set(asInstructor).send({ body: 'Đã xem' }).expect(201);

    const forInstructor = (await notificationsOf(asInstructor)).filter((n) => n.type === 'SubmissionComment');
    const forStudent = (await notificationsOf(asStudent)).filter((n) => n.type === 'SubmissionComment');
    expect(forInstructor).toHaveLength(1);
    expect(forInstructor[0].messageBody).toContain('Thầy xem giúp em');
    expect(forStudent).toHaveLength(1);
    expect(forStudent[0].groupKey).toBe(`${sub.id}:comments`);

    const thread = await t.http().get(api(`/submissions/${sub.id}/comments`)).set(asStudent).expect(200);
    expect(thread.body.map((c: { body: string }) => c.body)).toEqual(['Thầy xem giúp em', 'Đã xem']);

    const outsider = { Authorization: `Bearer ${await t.tokenFor(await makeUser(t.prisma))}` };
    await t.http().get(api(`/submissions/${sub.id}/comments`)).set(outsider).expect(404);
    await t.http().post(api(`/submissions/${sub.id}/comments`)).set(outsider).send({ body: 'x' }).expect(404);
  });

  it('AS10: due-soon reminders go once, to Active students who have not submitted and did not choose "Denied"', async () => {
    const submitted = await makeUser(t.prisma);
    const denied = await makeUser(t.prisma);
    for (const u of [submitted, denied]) await enroll(t.prisma, u, course.id);
    await t.prisma.notificationSubscription.create({
      data: { userId: denied.id, courseId: course.id, status: 'Denied' },
    });
    const a = await createPublished({ dueAt: new Date(Date.now() + 12 * HOUR) });
    await submit(a.id, 'xong', { Authorization: `Bearer ${await t.tokenFor(submitted)}` }).expect(201);
    await createPublished({ title: 'Còn xa', dueAt: new Date(Date.now() + 72 * HOUR) });

    expect(await reminders.run()).toEqual({ queued: 2 }); // student + denied; not `submitted`, not the far one
    expect(await reminders.run()).toEqual({ queued: 0 }); // never twice

    const dueSoon = (auth: { Authorization: string }) =>
      notificationsOf(auth).then((list) => list.filter((n) => n.type === 'AssignmentDueSoon'));
    expect(await dueSoon(asStudent)).toHaveLength(1);
    expect(await dueSoon({ Authorization: `Bearer ${await t.tokenFor(denied)}` })).toHaveLength(0);

    // Moving the due date (still within 24 h) does not send a second reminder.
    await t.http().patch(api(`/assignments/${a.id}`)).set(asInstructor)
      .send({ dueAt: new Date(Date.now() + 20 * HOUR) }).expect(200);
    expect(await reminders.run()).toEqual({ queued: 0 });
    expect(await dueSoon(asStudent)).toHaveLength(1);
  });

  it('AS11: only staff of the course manage and grade', async () => {
    const other = await makeUser(t.prisma, 'Instructor');
    const asOther = { Authorization: `Bearer ${await t.tokenFor(other)}` };
    await t
      .http()
      .post(api(`/modules/${lessons[0].moduleId}/assignments`))
      .set(asOther)
      .send({ title: 'x', instructions: 'y' })
      .expect(403);
    const a = await createPublished();
    const sub = (await submit(a.id).expect(201)).body;
    await t.http().patch(api(`/submissions/${sub.id}/grade`)).set(asOther).send({ score: 1 }).expect(403);
    await t.http().patch(api(`/submissions/${sub.id}/grade`)).set(asStudent).send({ score: 100 }).expect(403);
    await t.http().post(api(`/assignments/${a.id}/publish`)).set(asStudent).expect(403);
  });

  it('AS12: a student who is not enrolled cannot see or submit', async () => {
    const a = await createPublished();
    const stranger = { Authorization: `Bearer ${await t.tokenFor(await makeUser(t.prisma))}` };
    expect((await t.http().get(api(`/assignments/${a.id}`)).set(stranger).expect(403)).body.error.code).toBe('NOT_ENROLLED');
    await submit(a.id, 'x', stranger).expect(403);
  });

  it('AS13: deleting an assignment removes its lesson and completes students who finished the rest', async () => {
    const a = await createPublished();
    await t.http().post(api(`/lessons/${lessons[0].id}/complete`)).set(asStudent).expect(200);
    await t.http().delete(api(`/assignments/${a.id}`)).set(asInstructor).expect(204);
    expect(await t.prisma.lesson.count({ where: { type: 'Assignment' } })).toBe(0);
    const e = await t.prisma.enrollment.findFirstOrThrow({ where: { userId: student.id } });
    expect(e.status).toBe('Completed');
  });

  it('AS14: the lesson viewer points to the assignment', async () => {
    const a = await createPublished();
    const lesson = await t.http().get(api(`/lessons/${a.lessonId}`)).set(asStudent).expect(200);
    expect(lesson.body).toMatchObject({ type: 'Assignment', assignmentId: a.id });
  });

  it('N13: registering an account sends a welcome notification', async () => {
    const res = await t
      .http()
      .post(api('/auth/register'))
      .send({
        username: 'newbie',
        firstName: 'An',
        lastName: 'Nguyễn',
        email: 'newbie@example.com',
        password: 'Passw0rd!',
      })
      .expect(201);
    const list = await notificationsOf({ Authorization: `Bearer ${res.body.accessToken}` });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      type: 'System',
      title: 'Chào mừng An đến với EduLine!',
      actionUrl: '/courses',
    });
  });
});
