import { Course, Lesson, User } from '@prisma/client';
import { createTestApp, enroll, makeCourse, makeUser, resetDatabase, TestApp } from './helpers/app';

// Lesson viewer (GET /lessons/:id) and what happens to progress when an
// instructor deletes lessons or modules.
describe('lesson viewer and lesson deletion', () => {
  let t: TestApp;
  let instructor: User;
  let student: User;
  let course: Course;
  let lessons: Lesson[];
  let asStudent: { Authorization: string };
  let asInstructor: { Authorization: string };

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    instructor = await makeUser(t.prisma, 'Instructor');
    student = await makeUser(t.prisma);
    ({ course, lessons } = await makeCourse(t.prisma, instructor, ['Video', 'Text', 'Text']));
    asStudent = { Authorization: `Bearer ${await t.tokenFor(student)}` };
    asInstructor = { Authorization: `Bearer ${await t.tokenFor(instructor)}` };
  });

  const complete = (lessonId: number) =>
    t.prisma.lessonProgress.create({
      data: { userId: student.id, lessonId, courseId: course.id, percent: 100, completedAt: new Date() },
    });
  const enrollmentStatus = async () =>
    (await t.prisma.enrollment.findFirstOrThrow({ where: { userId: student.id, courseId: course.id } }))
      .status;
  const courseProgress = async () =>
    (await t.http().get(`/api/v1/courses/${course.id}/progress/me`).set(asStudent).expect(200)).body;

  // ─── Viewer ───────────────────────────────────────────────────────────────

  it('L01: an enrolled student opens a lesson; a Video lesson without a file plays the sample', async () => {
    await enroll(t.prisma, student, course.id);
    const res = await t.http().get(`/api/v1/lessons/les_${lessons[0].id}`).set(asStudent).expect(200);
    expect(res.body).toMatchObject({
      id: `les_${lessons[0].id}`,
      courseId: `crs_${course.id}`,
      type: 'Video',
      isSampleVideo: true,
    });
    expect(res.body.videoUrl).toMatch(/^https:\/\//);
    expect(res.body).not.toHaveProperty('videoKey');
  });

  it('L02: a student who is not enrolled gets 403 LESSON_LOCKED and no URL', async () => {
    const res = await t.http().get(`/api/v1/lessons/${lessons[0].id}`).set(asStudent).expect(403);
    expect(res.body.error.code).toBe('LESSON_LOCKED');
    expect(JSON.stringify(res.body)).not.toContain('https://');
  });

  it('L03: a preview lesson opens without logging in', async () => {
    await t.prisma.lesson.update({ where: { id: lessons[1].id }, data: { isPreview: true } });
    await t.http().get(`/api/v1/lessons/${lessons[1].id}`).expect(200);
    await t.http().get(`/api/v1/lessons/${lessons[2].id}`).expect(403);
  });

  it('L04: a lesson of a Draft course is 404 for students, 200 for its instructor', async () => {
    await t.prisma.course.update({ where: { id: course.id }, data: { visibility: 'Draft' } });
    const res = await t.http().get(`/api/v1/lessons/${lessons[1].id}`).set(asStudent).expect(404);
    expect(res.body.error.code).toBe('LESSON_NOT_FOUND');
    await t.http().get(`/api/v1/lessons/${lessons[1].id}`).set(asInstructor).expect(200);
  });

  it('L05: a suspended student cannot open lessons, previews included', async () => {
    await enroll(t.prisma, student, course.id, 'Suspended');
    await t.prisma.lesson.update({ where: { id: lessons[1].id }, data: { isPreview: true } });
    await t.http().get(`/api/v1/lessons/${lessons[0].id}`).set(asStudent).expect(403);
    await t.http().get(`/api/v1/lessons/${lessons[1].id}`).set(asStudent).expect(403);
  });

  it('L06: preview viewers can open a lesson but not record progress', async () => {
    await t.prisma.lesson.update({ where: { id: lessons[1].id }, data: { isPreview: true } });
    await t.http().get(`/api/v1/lessons/${lessons[1].id}`).set(asStudent).expect(200);
    const res = await t.http().post(`/api/v1/lessons/${lessons[1].id}/complete`).set(asStudent).expect(403);
    expect(res.body.error.code).toBe('PROGRESS_NOT_ALLOWED');
  });

  // ─── Deleting lessons ─────────────────────────────────────────────────────

  it('D01: deleting the only unfinished lesson completes the enrollment', async () => {
    await enroll(t.prisma, student, course.id);
    await complete(lessons[0].id);
    await complete(lessons[1].id);
    expect((await courseProgress()).progressPercentage).toBe(66);

    await t.http().delete(`/api/v1/lessons/${lessons[2].id}`).set(asInstructor).expect(204);

    expect(await enrollmentStatus()).toBe('Completed');
    expect((await courseProgress()).progressPercentage).toBe(100);
  });

  it('D02: deleting a finished lesson removes that progress; the percentage uses the remaining lessons', async () => {
    await enroll(t.prisma, student, course.id);
    await complete(lessons[0].id);
    expect((await courseProgress()).progressPercentage).toBe(33);

    await t.http().delete(`/api/v1/lessons/${lessons[0].id}`).set(asInstructor).expect(204);

    expect(await t.prisma.lessonProgress.count({ where: { userId: student.id } })).toBe(0);
    expect((await courseProgress()).progressPercentage).toBe(0);
    expect(await enrollmentStatus()).toBe('Active');
  });

  it('D03: deleting a module that held the last unfinished lessons completes the enrollment', async () => {
    await enroll(t.prisma, student, course.id);
    const extra = await t.prisma.module.create({
      data: { courseId: course.id, title: 'Extra', sortOrder: 2 },
    });
    await t.prisma.lesson.create({
      data: { moduleId: extra.id, courseId: course.id, title: 'Bonus', slug: 'bonus', type: 'Text', sortOrder: 1 },
    });
    for (const l of lessons) await complete(l.id);
    // 3 of 4 done: still Active.
    expect(await enrollmentStatus()).toBe('Active');

    await t.http().delete(`/api/v1/modules/${extra.id}`).set(asInstructor).expect(204);

    expect(await enrollmentStatus()).toBe('Completed');
  });

  it('D04: deleting every lesson completes nobody', async () => {
    await enroll(t.prisma, student, course.id);
    await complete(lessons[0].id);
    for (const l of lessons) {
      await t.http().delete(`/api/v1/lessons/${l.id}`).set(asInstructor).expect(204);
    }
    expect(await enrollmentStatus()).toBe('Active');
  });

  it('D05: only students who finished everything are completed; Dropped and Suspended stay as they are', async () => {
    const finisher = student;
    const halfway = await makeUser(t.prisma);
    const dropped = await makeUser(t.prisma);
    await enroll(t.prisma, finisher, course.id);
    await enroll(t.prisma, halfway, course.id);
    await enroll(t.prisma, dropped, course.id, 'Dropped');
    for (const u of [finisher, dropped]) {
      for (const l of lessons.slice(0, 2)) {
        await t.prisma.lessonProgress.create({
          data: { userId: u.id, lessonId: l.id, courseId: course.id, percent: 100, completedAt: new Date() },
        });
      }
    }
    await t.prisma.lessonProgress.create({
      data: { userId: halfway.id, lessonId: lessons[0].id, courseId: course.id, percent: 100, completedAt: new Date() },
    });

    await t.http().delete(`/api/v1/lessons/${lessons[2].id}`).set(asInstructor).expect(204);

    const statuses = Object.fromEntries(
      (await t.prisma.enrollment.findMany({ where: { courseId: course.id } })).map((e) => [e.userId, e.status]),
    );
    expect(statuses[finisher.id]).toBe('Completed');
    expect(statuses[halfway.id]).toBe('Active');
    expect(statuses[dropped.id]).toBe('Dropped');
  });

  it('D06: another instructor cannot delete the lesson, and nothing changes', async () => {
    const other = await makeUser(t.prisma, 'Instructor');
    const asOther = { Authorization: `Bearer ${await t.tokenFor(other)}` };
    await t.http().delete(`/api/v1/lessons/${lessons[0].id}`).set(asOther).expect(403);
    expect(await t.prisma.lesson.count({ where: { courseId: course.id } })).toBe(3);
  });
});
