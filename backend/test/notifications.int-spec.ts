import { Course, Lesson, User } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { OutboxProcessor } from '../src/events/outbox-processor.service';
import { createTestApp, enroll, makeCourse, makeUser, resetDatabase, TestApp } from './helpers/app';

// Phase 1 of docs/m2-plan.md: outbox processing, notification fan-out, the
// notification read API and course subscriptions.
describe('notifications', () => {
  let t: TestApp;
  let outbox: OutboxProcessor;
  let instructor: User;
  let student: User;
  let course: Course;
  let lessons: Lesson[];
  let asStudent: { Authorization: string };

  beforeAll(async () => {
    t = await createTestApp();
    outbox = t.app.get(OutboxProcessor);
  });
  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    instructor = await makeUser(t.prisma, 'Instructor');
    student = await makeUser(t.prisma);
    ({ course, lessons } = await makeCourse(t.prisma, instructor, ['Text', 'Text']));
    await t.prisma.course.update({
      where: { id: course.id },
      data: { welcomeMessage: 'Xin chào cả lớp!', thumbnailUrl: '/images/courses/cloud_course.png' },
    });
    asStudent = { Authorization: `Bearer ${await t.tokenFor(student)}` };
  });

  const enrollViaApi = (body: object = {}) =>
    t.http().post(`/api/v1/courses/${course.id}/enroll`).set(asStudent).send(body).expect(201);
  const myNotifications = async (query = '') =>
    (await t.http().get(`/api/v1/notifications${query}`).set(asStudent).expect(200)).body;

  it('N01: enrolling in a course with a welcome message notifies the student', async () => {
    await enrollViaApi();
    expect((await myNotifications()).meta.total).toBe(0); // not handled yet

    expect(await outbox.processPending()).toEqual({ processed: 1, failed: 0 });

    const list = await myNotifications();
    expect(list.meta.total).toBe(1);
    expect(list.data[0]).toMatchObject({
      type: 'CourseWelcome',
      messageBody: 'Xin chào cả lớp!',
      imageUrl: '/images/courses/cloud_course.png',
      actionUrl: `/courses/${course.slug}`,
      isRead: false,
    });
    expect(list.data[0].id).toMatch(/^ntf_\d+$/);
    expect(list.data[0]).not.toHaveProperty('sourceEventId');
  });

  it('N02: no welcome message, no notification; the event is still marked handled', async () => {
    await t.prisma.course.update({ where: { id: course.id }, data: { welcomeMessage: null } });
    await enrollViaApi();
    await outbox.processPending();
    expect((await myNotifications()).meta.total).toBe(0);
    expect(await t.prisma.outboxEvent.count({ where: { publishedAt: null } })).toBe(0);
  });

  it('N03: the welcome message ignores "Denied" (personal notification)', async () => {
    await enrollViaApi({ notifications: 'Denied' });
    await outbox.processPending();
    expect((await myNotifications()).meta.total).toBe(1);
    const sub = await t.http().get(`/api/v1/courses/${course.id}/subscription`).set(asStudent).expect(200);
    expect(sub.body.status).toBe('Denied');
  });

  it('N04: handling the same event twice creates one notification', async () => {
    await enrollViaApi();
    await outbox.processPending();
    await t.prisma.outboxEvent.updateMany({ data: { publishedAt: null } });
    await outbox.processPending();
    expect((await myNotifications()).meta.total).toBe(1);
  });

  it('N05: finishing the last lesson sends one "course completed" notification', async () => {
    await enroll(t.prisma, student, course.id);
    for (const l of lessons) {
      await t.http().post(`/api/v1/lessons/${l.id}/complete`).set(asStudent).expect(200);
    }
    // The enrollment is now Completed, so it is read-only: completing again is refused.
    await t.http().post(`/api/v1/lessons/${lessons[1].id}/complete`).set(asStudent).expect(403);
    await outbox.processPending();

    const list = await myNotifications();
    const completed = list.data.filter((n: { type: string }) => n.type === 'CourseCompleted');
    expect(completed).toHaveLength(1);
    expect(await t.prisma.outboxEvent.count({ where: { type: 'COURSE_COMPLETED' } })).toBe(1);
  });

  it('N06: an Admin decision on an instructor request notifies the user', async () => {
    const admin = await makeUser(t.prisma, 'Admin');
    await t.prisma.user.update({ where: { id: student.id }, data: { instructorRequestStatus: 'Pending' } });
    await t
      .http()
      .post(`/api/v1/admin/users/${student.id}/instructor-request/approve`)
      .set({ Authorization: `Bearer ${await t.tokenFor(admin)}` })
      .expect(200);
    await outbox.processPending();
    expect((await myNotifications()).data[0]).toMatchObject({ type: 'System', actionUrl: '/account' });
  });

  it('N07: unread count, mark one read, mark all read; filter by unread', async () => {
    for (let i = 0; i < 3; i++) {
      await t.prisma.notification.create({
        data: { recipientId: student.id, type: 'System', title: `T${i}`, messageBody: 'x' },
      });
    }
    const count = () =>
      t.http().get('/api/v1/notifications/unread-count').set(asStudent).expect(200);
    expect((await count()).body).toEqual({ count: 3 });

    const first = (await myNotifications()).data[0];
    const read = await t.http().patch(`/api/v1/notifications/${first.id}/read`).set(asStudent).expect(200);
    expect(read.body.isRead).toBe(true);
    expect((await count()).body).toEqual({ count: 2 });
    expect((await myNotifications('?unread=true')).meta.total).toBe(2);

    const all = await t.http().patch('/api/v1/notifications/read-all').set(asStudent).expect(200);
    expect(all.body).toEqual({ updated: 2 });
    expect((await count()).body).toEqual({ count: 0 });
  });

  it("N08 (T31): another user's notification answers 404 and is not changed", async () => {
    const n = await t.prisma.notification.create({
      data: { recipientId: instructor.id, type: 'System', title: 'Private', messageBody: 'x' },
    });
    await t.http().patch(`/api/v1/notifications/${n.id}/read`).set(asStudent).expect(404);
    expect((await t.prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).isRead).toBe(false);
    expect((await myNotifications()).meta.total).toBe(0);
  });

  it('N09: subscriptions need an enrollment; staff may subscribe too', async () => {
    await t
      .http()
      .put(`/api/v1/courses/${course.id}/subscription`)
      .set(asStudent)
      .send({ status: 'Denied' })
      .expect(403);
    await enroll(t.prisma, student, course.id);
    await t
      .http()
      .put(`/api/v1/courses/${course.id}/subscription`)
      .set(asStudent)
      .send({ status: 'Granted' })
      .expect(200);
    const mine = await t.http().get('/api/v1/me/subscriptions').set(asStudent).expect(200);
    expect(mine.body).toEqual([expect.objectContaining({ courseId: `crs_${course.id}`, status: 'Granted' })]);

    const asInstructor = { Authorization: `Bearer ${await t.tokenFor(instructor)}` };
    await t
      .http()
      .put(`/api/v1/courses/${course.id}/subscription`)
      .set(asInstructor)
      .send({ status: 'Denied' })
      .expect(200);
    await t
      .http()
      .put(`/api/v1/courses/${course.id}/subscription`)
      .set(asStudent)
      .send({ status: 'Maybe' })
      .expect(400);
  });

  it('N10: broadcast audience = Active students minus "Denied"', async () => {
    const granted = await makeUser(t.prisma);
    const denied = await makeUser(t.prisma);
    const dropped = await makeUser(t.prisma);
    await enroll(t.prisma, student, course.id); // never answered = Default
    await enroll(t.prisma, granted, course.id);
    await enroll(t.prisma, denied, course.id);
    await enroll(t.prisma, dropped, course.id, 'Dropped');
    await t.prisma.notificationSubscription.createMany({
      data: [
        { userId: granted.id, courseId: course.id, status: 'Granted' },
        { userId: denied.id, courseId: course.id, status: 'Denied' },
      ],
    });
    const { NotificationsService } = await import('../src/modules/notifications/notifications.service');
    const audience = await t.app.get(NotificationsService).broadcastAudience(t.prisma, course.id);
    expect(new Set(audience)).toEqual(new Set([student.id, granted.id]));
  });

  it('N11: a broken event is retried, then skipped, and does not block later events', async () => {
    await t.prisma.outboxEvent.create({
      data: { type: 'ENROLLMENT_CREATED', payload: { courseId: 'not-an-id', userId: student.id } },
    });
    await enrollViaApi(); // a good event behind the broken one

    for (let i = 0; i < 5; i++) await outbox.processPending();
    const broken = await t.prisma.outboxEvent.findFirstOrThrow({ where: { lastError: { not: null } } });
    expect(broken.attempts).toBe(5);
    expect(broken.publishedAt).toBeNull();

    await outbox.processPending();
    expect((await myNotifications()).meta.total).toBe(1);
  });

  it('N14: inbox: open one, mark unread, filter by type, delete; others get 404', async () => {
    const make = (type: 'System' | 'AssignmentGraded', title: string) =>
      t.prisma.notification.create({ data: { recipientId: student.id, type, title, messageBody: 'x' } });
    const a = await make('System', 'A');
    await make('AssignmentGraded', 'B');

    const one = await t.http().get(`/api/v1/notifications/ntf_${a.id}`).set(asStudent).expect(200);
    expect(one.body).toMatchObject({ title: 'A', isRead: false });
    await t.http().patch(`/api/v1/notifications/${a.id}/read`).set(asStudent).expect(200);
    const unread = await t.http().patch(`/api/v1/notifications/${a.id}/unread`).set(asStudent).expect(200);
    expect(unread.body.isRead).toBe(false);

    const graded = await myNotifications('?types=AssignmentGraded,AssignmentPublished');
    expect(graded.data.map((n: { title: string }) => n.title)).toEqual(['B']);
    await t.http().get('/api/v1/notifications?types=Nope').set(asStudent).expect(400);

    const asInstructor = { Authorization: `Bearer ${await t.tokenFor(instructor)}` };
    await t.http().get(`/api/v1/notifications/${a.id}`).set(asInstructor).expect(404);
    await t.http().delete(`/api/v1/notifications/${a.id}`).set(asInstructor).expect(404);
    await t.http().delete(`/api/v1/notifications/${a.id}`).set(asStudent).expect(204);
    expect((await myNotifications()).meta.total).toBe(1);
  });

  it('N12: /internal/outbox/flush is 404 without a configured token', async () => {
    await t.http().post('/api/v1/internal/outbox/flush').set('X-Internal-Token', randomUUID()).expect(404);
  });
});
