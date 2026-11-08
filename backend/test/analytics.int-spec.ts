import { Course, Lesson, User } from '@prisma/client';
import {
  createTestApp,
  enroll,
  makeCourse,
  makeQuiz,
  makeUser,
  resetDatabase,
  TestApp,
} from './helpers/app';
import { vmluBySubject } from './helpers/vmlu';

describe('instructor analytics', () => {
  let t: TestApp;
  let instructor: User;
  let course: Course;
  let lessons: Lesson[];
  let students: User[];
  let auth: { Authorization: string };
  const api = (path: string) => `/api/v1/instructor/courses/${course.id}/analytics${path}`;
  const days = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    instructor = await makeUser(t.prisma, 'Instructor');
    ({ course, lessons } = await makeCourse(t.prisma, instructor, [
      'Text',
      'Quiz',
      'Assignment',
      'Text',
    ]));
    students = [];
    for (let i = 0; i < 4; i++) students.push(await makeUser(t.prisma));
    auth = { Authorization: `Bearer ${await t.tokenFor(instructor)}` };
  });

  const complete = (user: User, lesson: Lesson, when = new Date()) =>
    t.prisma.lessonProgress.create({
      data: {
        userId: user.id,
        lessonId: lesson.id,
        courseId: course.id,
        percent: 100,
        completedAt: when,
        updatedAt: when,
      },
    });

  it('A01: a student gets 403', async () => {
    await enroll(t.prisma, students[0], course.id);
    const token = await t.tokenFor(students[0]);
    await t
      .http()
      .get(api(''))
      .set({ Authorization: `Bearer ${token}` })
      .expect(403);
    await t
      .http()
      .get(api('/students'))
      .set({ Authorization: `Bearer ${token}` })
      .expect(403);
  });

  it('A02: an instructor of another course is refused', async () => {
    const other = await makeUser(t.prisma, 'Instructor');
    await makeCourse(t.prisma, other, ['Text']);
    const res = await t
      .http()
      .get(api(''))
      .set({ Authorization: `Bearer ${await t.tokenFor(other)}` })
      .expect(403);
    expect(res.body.error.code).toBe('COURSE_STAFF_ONLY');
  });

  it('an Admin can read any course, and an unknown course is 404', async () => {
    const admin = await makeUser(t.prisma, 'Admin');
    const adminAuth = { Authorization: `Bearer ${await t.tokenFor(admin)}` };
    await t.http().get(api('')).set(adminAuth).expect(200);
    await t.http().get('/api/v1/instructor/courses/999999/analytics').set(adminAuth).expect(404);
  });

  it('A03: a course nobody has joined reports null, not 0', async () => {
    const quiz = await makeQuiz(
      t.prisma,
      course.id,
      lessons[1].id,
      vmluBySubject('dev').get('28')!.slice(0, 3),
    );
    const res = await t.http().get(api('')).set(auth).expect(200);
    expect(res.body.averageProgressPercentage).toBeNull();
    expect(res.body.completionRatePercentage).toBeNull();
    expect(res.body.activeStudentsLast7Days).toBe(0);
    expect(res.body.quizzes).toEqual([
      expect.objectContaining({
        quizId: `qz_${quiz.id}`,
        attempts: 0,
        averageScorePercentage: null,
        passRatePercentage: null,
      }),
    ]);
  });

  it('A04: 2 Completed and 2 Active enrollments is a 50 % completion rate', async () => {
    await enroll(t.prisma, students[0], course.id, 'Completed');
    await enroll(t.prisma, students[1], course.id, 'Completed');
    await enroll(t.prisma, students[2], course.id, 'Active');
    await enroll(t.prisma, students[3], course.id, 'Active');
    const res = await t.http().get(api('')).set(auth).expect(200);
    expect(res.body.enrollmentsByStatus).toEqual({
      Active: 2,
      Completed: 2,
      Suspended: 0,
      Dropped: 0,
    });
    expect(res.body.completionRatePercentage).toBe(50);
    // Completed reads 100, the two Active students have done nothing: (100+100+0+0)/4.
    expect(res.body.averageProgressPercentage).toBe(50);
  });

  it('A05: activity 8 days ago is not counted, activity 2 days ago is', async () => {
    for (const s of students.slice(0, 3)) await enroll(t.prisma, s, course.id);
    await complete(students[0], lessons[0], days(8));
    await complete(students[1], lessons[0], days(2));
    const res = await t.http().get(api('')).set(auth).expect(200);
    expect(res.body.activeStudentsLast7Days).toBe(1);
    // A quiz submitted yesterday makes the third student active too.
    const quiz = await makeQuiz(
      t.prisma,
      course.id,
      lessons[1].id,
      vmluBySubject('dev').get('28')!.slice(0, 2),
    );
    await t.prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: students[2].id,
        status: 'Submitted',
        submittedAt: days(1),
        score: 0,
        maxScore: 20,
        passed: false,
      },
    });
    expect((await t.http().get(api('')).set(auth).expect(200)).body.activeStudentsLast7Days).toBe(
      2,
    );
  });

  it('per-quiz attempts, average score and pass rate come from Submitted attempts only', async () => {
    const quiz = await makeQuiz(
      t.prisma,
      course.id,
      lessons[1].id,
      vmluBySubject('dev').get('28')!.slice(0, 5),
    );
    for (const s of students.slice(0, 3)) await enroll(t.prisma, s, course.id);
    const attempt = (user: User, score: number, passed: boolean) =>
      t.prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          userId: user.id,
          status: 'Submitted',
          submittedAt: new Date(),
          score,
          maxScore: 50,
          passed,
        },
      });
    await attempt(students[0], 50, true);
    await attempt(students[1], 40, true);
    await attempt(students[2], 10, false);
    // An unfinished attempt must not count.
    await t.prisma.quizAttempt.create({ data: { quizId: quiz.id, userId: students[2].id } });

    const res = await t.http().get(api('')).set(auth).expect(200);
    expect(res.body.quizzes[0]).toMatchObject({
      attempts: 3,
      averageScorePercentage: 67, // 100 of 150 points
      passRatePercentage: 67, // 2 of 3
    });
  });

  it('per-assignment submitted, graded and late counts', async () => {
    const assignment = await t.prisma.assignment.create({
      data: {
        courseId: course.id,
        lessonId: lessons[2].id,
        title: 'Script',
        instructions: 'Write it.',
      },
    });
    for (const s of students) await enroll(t.prisma, s, course.id);
    const sub = (user: User, over: object) =>
      t.prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          userId: user.id,
          fileKey: 'k',
          fileName: 'a.py',
          sizeBytes: 1,
          mimeType: 'text/x-python',
          ...over,
        },
      });
    await sub(students[0], { status: 'Graded', score: 90 });
    await sub(students[1], { isLate: true });
    await sub(students[2], { status: 'Graded', isLate: true, score: 50 });
    const res = await t.http().get(api('')).set(auth).expect(200);
    expect(res.body.assignments[0]).toMatchObject({ submitted: 3, graded: 2, late: 2 });
  });

  it('student list: progress, last activity, quiz average and submission count per student', async () => {
    const quiz = await makeQuiz(
      t.prisma,
      course.id,
      lessons[1].id,
      vmluBySubject('dev').get('28')!.slice(0, 5),
    );
    for (const s of students.slice(0, 3)) await enroll(t.prisma, s, course.id);
    await complete(students[0], lessons[0]);
    await complete(students[0], lessons[3]);
    await t.prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: students[0].id,
        status: 'Submitted',
        submittedAt: new Date(),
        score: 30,
        maxScore: 50,
        passed: false,
      },
    });

    const res = await t.http().get(api('/students')).set(auth).expect(200);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 20, total: 3 });
    const [first, second] = res.body.data;
    expect(first.student.id).toBe(students[0].id);
    expect(first).toMatchObject({
      status: 'Active',
      progressPercentage: 50,
      quizAvgScorePercentage: 60,
      submissionsCount: 0,
    });
    expect(first.lastActivityAt).not.toBeNull();
    // The student who has done nothing has nothing to average.
    expect(second).toMatchObject({
      progressPercentage: 0,
      lastActivityAt: null,
      quizAvgScorePercentage: null,
    });
    expect(first.student).not.toHaveProperty('passwordHash');
  });

  it('A06: pageSize above 100 is rejected and pagination slices the list', async () => {
    for (const s of students) await enroll(t.prisma, s, course.id);
    await t.http().get(api('/students?pageSize=500')).set(auth).expect(400);
    const page2 = await t.http().get(api('/students?page=2&pageSize=3')).set(auth).expect(200);
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.meta).toEqual({ page: 2, pageSize: 3, total: 4 });
  });
});
