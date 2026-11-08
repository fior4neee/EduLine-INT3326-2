import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccountType, EnrollmentStatus, LessonType, PrismaClient, User } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AccessTokenService } from '../../src/common/auth/access-token.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { VmluQuestion } from './vmlu';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaClient;
  http: () => ReturnType<typeof request>;
  tokenFor: (user: Pick<User, 'id' | 'accountType'>) => Promise<string>;
}

export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();
  const tokens = app.get(AccessTokenService);
  return {
    app,
    prisma: app.get(PrismaService),
    http: () => request(app.getHttpServer()),
    tokenFor: (u) => tokens.sign(u, 'test-session'),
  };
}

// Empties every table. Safe only because setup-env.ts checks the database name.
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const tables = rows.map((r) => `"${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

let seq = 0;
const next = () => ++seq;

export function makeUser(prisma: PrismaClient, accountType: AccountType = 'Student') {
  const n = next();
  return prisma.user.create({
    data: {
      username: `user${n}`,
      firstName: `First${n}`,
      lastName: `Last${n}`,
      email: `user${n}@example.com`,
      accountType,
      passwordHash: 'not-a-real-hash',
    },
  });
}

// One Public course with one module and a lesson of each given type, taught by `instructor`.
export async function makeCourse(prisma: PrismaClient, instructor: User, types: LessonType[]) {
  const n = next();
  const course = await prisma.course.create({
    data: {
      title: `Course ${n}`,
      slug: `course-${n}`,
      difficultyLevel: 'College',
      visibility: 'Public',
      instructors: { create: { instructorId: instructor.id } },
    },
  });
  const module = await prisma.module.create({
    data: { courseId: course.id, title: 'Module 1', sortOrder: 1 },
  });
  const lessons = [];
  for (const [i, type] of types.entries()) {
    lessons.push(
      await prisma.lesson.create({
        data: {
          moduleId: module.id,
          courseId: course.id,
          title: `Lesson ${i + 1}`,
          slug: `lesson-${n}-${i + 1}`,
          type,
          sortOrder: i + 1,
        },
      }),
    );
  }
  return { course, lessons };
}

export function enroll(
  prisma: PrismaClient,
  user: User,
  courseId: number,
  status: EnrollmentStatus = 'Active',
) {
  return prisma.enrollment.create({ data: { userId: user.id, courseId, status } });
}

// A quiz on `lessonId` whose questions are real VMLU questions (10 points each).
export function makeQuiz(
  prisma: PrismaClient,
  courseId: number,
  lessonId: number,
  questions: VmluQuestion[],
  passingScorePercentage = 80,
) {
  return prisma.quiz.create({
    data: {
      courseId,
      lessonId,
      title: `Quiz ${next()}`,
      passingScorePercentage,
      questions: {
        create: questions.map((q, i) => ({
          questionText: q.questionText,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          points: 10,
          sortOrder: i + 1,
        })),
      },
    },
    include: { questions: true },
  });
}
