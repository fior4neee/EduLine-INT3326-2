import { Course, Lesson, User } from '@prisma/client';
import { ProgressService } from '../src/modules/progress/progress.service';
import { createTestApp, enroll, makeCourse, makeUser, resetDatabase, TestApp } from './helpers/app';

describe('lesson and course progress', () => {
  let t: TestApp;
  let student: User;
  let instructor: User;
  let course: Course;
  let video: Lesson, text: Lesson, doc: Lesson, quiz: Lesson;
  let auth: { Authorization: string };

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
    ({
      course,
      lessons: [video, text, doc, quiz],
    } = await makeCourse(t.prisma, instructor, ['Video', 'Text', 'Document', 'Quiz']));
    await enroll(t.prisma, student, course.id);
    auth = { Authorization: `Bearer ${await t.tokenFor(student)}` };
  });

  const heartbeat = (lessonId: number, positionSeconds: number, durationSeconds = 600) =>
    t
      .http()
      .put(`/api/v1/lessons/${lessonId}/progress`)
      .set(auth)
      .send({ positionSeconds, durationSeconds });

  it('P01: 300 s of 600 s is 50 %, not complete', async () => {
    const res = await heartbeat(video.id, 300).expect(200);
    expect(res.body).toEqual({
      lessonId: `les_${video.id}`,
      lastPositionSeconds: 300,
      percent: 50,
      completedAt: null,
    });
  });

  it('P02: reaching 90 % completes the lesson', async () => {
    const res = await heartbeat(video.id, 540).expect(200);
    expect(res.body.percent).toBe(90);
    expect(res.body.completedAt).not.toBeNull();
  });

  it('P03: seeking back moves the resume point but never lowers percent or completedAt', async () => {
    const first = await heartbeat(video.id, 560).expect(200);
    const back = await heartbeat(video.id, 60).expect(200);
    expect(back.body.lastPositionSeconds).toBe(60);
    expect(back.body.percent).toBe(first.body.percent);
    expect(back.body.completedAt).toBe(first.body.completedAt);
  });

  it('P04: a heartbeat for a text lesson is 422 LESSON_TYPE_NOT_SUPPORTED', async () => {
    const res = await heartbeat(text.id, 10).expect(422);
    expect(res.body.error.code).toBe('LESSON_TYPE_NOT_SUPPORTED');
  });

  it.each([
    ['zero duration', 10, 0],
    ['negative position', -1, 600],
    ['position far past the end', 700, 600],
  ])('P05: %s is 400 INVALID_PROGRESS', async (_name, position, duration) => {
    const res = await heartbeat(video.id, position, duration).expect(400);
    expect(res.body.error.code).toBe('INVALID_PROGRESS');
  });

  it('P06: a student who is not enrolled gets 404 for a regular lesson', async () => {
    const stranger = await makeUser(t.prisma);
    const res = await t
      .http()
      .put(`/api/v1/lessons/${video.id}/progress`)
      .set({ Authorization: `Bearer ${await t.tokenFor(stranger)}` })
      .send({ positionSeconds: 10, durationSeconds: 600 })
      .expect(404);
    expect(res.body.error.code).toBe('LESSON_NOT_FOUND');
    expect(await t.prisma.lessonProgress.count()).toBe(0);
  });

  it('P07: a Completed enrollment can read progress but not record it', async () => {
    await t.prisma.enrollment.updateMany({
      where: { userId: student.id },
      data: { status: 'Completed' },
    });
    const res = await heartbeat(video.id, 100).expect(403);
    expect(res.body.error.code).toBe('PROGRESS_NOT_ALLOWED');
    await t.http().get(`/api/v1/lessons/${video.id}/progress`).set(auth).expect(200);
    await t.http().get(`/api/v1/courses/${course.id}/progress/me`).set(auth).expect(200);
  });

  it('an instructor cannot record progress', async () => {
    await t
      .http()
      .put(`/api/v1/lessons/${video.id}/progress`)
      .set({ Authorization: `Bearer ${await t.tokenFor(instructor)}` })
      .send({ positionSeconds: 10, durationSeconds: 600 })
      .expect(403);
  });

  it('GET returns zeros for a lesson never opened', async () => {
    const res = await t.http().get(`/api/v1/lessons/${doc.id}/progress`).set(auth).expect(200);
    expect(res.body).toEqual({
      lessonId: `les_${doc.id}`,
      lastPositionSeconds: 0,
      percent: 0,
      completedAt: null,
    });
  });

  it('P08: completing a text lesson twice keeps the same completedAt', async () => {
    const complete = () =>
      t.http().post(`/api/v1/lessons/${text.id}/complete`).set(auth).expect(200);
    const a = await complete();
    const b = await complete();
    expect(a.body.percent).toBe(100);
    expect(a.body.completedAt).not.toBeNull();
    expect(b.body.completedAt).toBe(a.body.completedAt);
  });

  it('/complete on a video or quiz lesson is 422', async () => {
    for (const lesson of [video, quiz]) {
      const res = await t
        .http()
        .post(`/api/v1/lessons/${lesson.id}/complete`)
        .set(auth)
        .expect(422);
      expect(res.body.error.code).toBe('LESSON_TYPE_NOT_SUPPORTED');
    }
  });

  it('P10: course progress rounds down: 3 of 4 lessons is 75, 1 of 4 is 25', async () => {
    await t.http().post(`/api/v1/lessons/${text.id}/complete`).set(auth).expect(200);
    let res = await t.http().get(`/api/v1/courses/${course.id}/progress/me`).set(auth).expect(200);
    expect(res.body.progressPercentage).toBe(25);

    await heartbeat(video.id, 600);
    await t.http().post(`/api/v1/lessons/${doc.id}/complete`).set(auth);
    res = await t.http().get(`/api/v1/courses/${course.id}/progress/me`).set(auth).expect(200);
    expect(res.body.progressPercentage).toBe(75);
    expect(res.body.completedLessonIds.sort()).toEqual(
      [video, text, doc].map((l) => `les_${l.id}`).sort(),
    );
    expect(res.body.resumeLessonId).toBe(`les_${quiz.id}`);
  });

  it('P09: finishing the last lesson makes the enrollment Completed', async () => {
    await heartbeat(video.id, 600);
    await t.http().post(`/api/v1/lessons/${text.id}/complete`).set(auth);
    await t.http().post(`/api/v1/lessons/${doc.id}/complete`).set(auth);
    let e = await t.prisma.enrollment.findFirstOrThrow({ where: { userId: student.id } });
    expect(e.status).toBe('Active');

    // M2's quiz submit calls this when an attempt passes.
    const progress = t.app.get(ProgressService);
    expect(
      await progress.markLessonCompleted({
        userId: student.id,
        courseId: course.id,
        lessonId: quiz.id,
      }),
    ).toBe(true);
    // Calling again is harmless and reports nothing new.
    expect(
      await progress.markLessonCompleted({
        userId: student.id,
        courseId: course.id,
        lessonId: quiz.id,
      }),
    ).toBe(false);

    e = await t.prisma.enrollment.findFirstOrThrow({ where: { userId: student.id } });
    expect(e.status).toBe('Completed');
    expect(e.completedAt).not.toBeNull();
    const res = await t
      .http()
      .get(`/api/v1/courses/${course.id}/progress/me`)
      .set(auth)
      .expect(200);
    expect(res.body).toMatchObject({ progressPercentage: 100, resumeLessonId: null });
  });

  it('markLessonCompleted inside a rolled-back transaction leaves nothing behind', async () => {
    const progress = t.app.get(ProgressService);
    await expect(
      t.prisma.$transaction(async (tx) => {
        await progress.markLessonCompleted(
          { userId: student.id, courseId: course.id, lessonId: quiz.id },
          tx,
        );
        throw new Error('submit failed');
      }),
    ).rejects.toThrow('submit failed');
    expect(await t.prisma.lessonProgress.count()).toBe(0);
  });

  it('GET /me/courses and /users/me report the real progress percentage', async () => {
    await t.http().post(`/api/v1/lessons/${text.id}/complete`).set(auth);
    const mine = await t.http().get('/api/v1/me/courses').set(auth).expect(200);
    expect(mine.body.data[0].progressPercentage).toBe(25);
    const me = await t.http().get('/api/v1/users/me').set(auth).expect(200);
    expect(me.body.enrolledCourses[0].progressPercentage).toBe(25);
  });

  it('concurrent heartbeats never lower percent and complete once', async () => {
    const positions = [100, 590, 300, 600, 50, 580, 560, 20];
    await Promise.all(positions.map((p) => heartbeat(video.id, p)));
    const row = await t.prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId: student.id, lessonId: video.id } },
    });
    expect(row.percent).toBe(100);
    expect(row.completedAt).not.toBeNull();
    expect(await t.prisma.lessonProgress.count()).toBe(1);
  });

  it('requires a login', async () => {
    await t.http().get(`/api/v1/lessons/${video.id}/progress`).expect(401);
  });
});
