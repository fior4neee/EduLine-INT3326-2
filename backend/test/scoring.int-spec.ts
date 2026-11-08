import { Lesson, User } from '@prisma/client';
import { ProgressService } from '../src/modules/progress/progress.service';
import { ScoringService } from '../src/modules/scoring/scoring.service';
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

// Plays the part of M2's submit transaction: load the attempt, score it, write the result.
const scoring = new ScoringService();

async function submit(t: TestApp, attemptId: number) {
  return t.prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { quiz: { include: { questions: true } }, answers: true },
    });
    const r = scoring.score(attempt.quiz.questions, attempt.answers);
    for (const a of r.perAnswer) {
      await tx.attemptAnswer.update({ where: { id: a.id }, data: { pointsAwarded: a.points } });
    }
    const passed = scoring.isPassed(r.score, r.maxScore, attempt.quiz.passingScorePercentage);
    const done = await tx.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'Submitted',
        submittedAt: new Date(),
        score: r.score,
        maxScore: r.maxScore,
        passed,
      },
    });
    if (passed) {
      await t.app.get(ProgressService).markLessonCompleted(
        {
          userId: attempt.userId,
          courseId: attempt.quiz.courseId,
          lessonId: attempt.quiz.lessonId,
        },
        tx,
      );
    }
    return done;
  });
}

describe('quiz scoring on real VMLU questions', () => {
  let t: TestApp;
  let student: User;
  let lesson: Lesson;
  let courseId: number;
  // The first five questions of VMLU subject 28 (dev split), an economics quiz.
  const questions = vmluBySubject('dev').get('28')!.slice(0, 5);

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDatabase(t.prisma);
    const instructor = await makeUser(t.prisma, 'Instructor');
    student = await makeUser(t.prisma);
    const made = await makeCourse(t.prisma, instructor, ['Quiz', 'Text']);
    lesson = made.lessons[0];
    courseId = made.course.id;
    await enroll(t.prisma, student, courseId);
  });

  async function attemptWith(
    quizId: number,
    pick: (q: { correctOptionIndex: number; options: string[] }, i: number) => number | null,
  ) {
    const quiz = await t.prisma.quiz.findUniqueOrThrow({
      where: { id: quizId },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });
    return t.prisma.quizAttempt.create({
      data: {
        quizId,
        userId: student.id,
        answers: {
          create: quiz.questions.map((q, i) => ({
            questionId: q.id,
            selectedOptionIndex: pick(q, i),
          })),
        },
      },
    });
  }

  it('the VMLU answer key survives the import: "B" becomes index 1', async () => {
    const quiz = await makeQuiz(t.prisma, courseId, lesson.id, questions);
    const first = questions[0];
    const stored = quiz.questions.find((q) => q.questionText === first.questionText)!;
    expect(stored.correctOptionIndex).toBe(first.correctOptionIndex);
    expect(stored.options.every((o) => !/^[A-E]\.\s/.test(o))).toBe(true);
    expect(stored.options.length).toBeGreaterThanOrEqual(3);
  });

  it('all answers right: full score, passed, and the quiz lesson completes', async () => {
    const quiz = await makeQuiz(t.prisma, courseId, lesson.id, questions);
    const attempt = await attemptWith(quiz.id, (q) => q.correctOptionIndex);
    const done = await submit(t, attempt.id);
    expect(done).toMatchObject({ score: 50, maxScore: 50, passed: true, status: 'Submitted' });
    const progress = await t.prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId: student.id, lessonId: lesson.id } },
    });
    expect(progress.completedAt).not.toBeNull();
  });

  it('all answers wrong: 0 points, not passed, the lesson stays open', async () => {
    const quiz = await makeQuiz(t.prisma, courseId, lesson.id, questions);
    const attempt = await attemptWith(
      quiz.id,
      (q) => (q.correctOptionIndex + 1) % q.options.length,
    );
    const done = await submit(t, attempt.id);
    expect(done).toMatchObject({ score: 0, maxScore: 50, passed: false });
    expect(await t.prisma.lessonProgress.count()).toBe(0);
  });

  it('unanswered questions score 0 but still count in maxScore', async () => {
    const quiz = await makeQuiz(t.prisma, courseId, lesson.id, questions);
    const attempt = await attemptWith(quiz.id, (q, i) => (i < 2 ? q.correctOptionIndex : null));
    expect(await submit(t, attempt.id)).toMatchObject({ score: 20, maxScore: 50, passed: false });
  });

  it('exactly 80 % passes and 60 % does not', async () => {
    const quiz = await makeQuiz(t.prisma, courseId, lesson.id, questions);
    const four = await attemptWith(quiz.id, (q, i) =>
      i < 4 ? q.correctOptionIndex : (q.correctOptionIndex + 1) % q.options.length,
    );
    expect(await submit(t, four.id)).toMatchObject({ score: 40, passed: true });
    await t.prisma.quizAttempt.update({ where: { id: four.id }, data: { status: 'Submitted' } });
    const three = await attemptWith(quiz.id, (q, i) =>
      i < 3 ? q.correctOptionIndex : (q.correctOptionIndex + 1) % q.options.length,
    );
    expect(await submit(t, three.id)).toMatchObject({ score: 30, passed: false });
  });

  it('points written per answer add up to the attempt score', async () => {
    const quiz = await makeQuiz(t.prisma, courseId, lesson.id, questions);
    const attempt = await attemptWith(quiz.id, (q, i) =>
      i % 2 === 0 ? q.correctOptionIndex : null,
    );
    const done = await submit(t, attempt.id);
    const answers = await t.prisma.attemptAnswer.findMany({ where: { attemptId: attempt.id } });
    expect(answers.reduce((n, a) => n + (a.pointsAwarded ?? 0), 0)).toBe(done.score);
  });
});
