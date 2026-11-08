import { HttpStatus, Injectable } from '@nestjs/common';
import type { CourseVisibility, LessonType } from '@prisma/client';
import type { AuthUser } from '../../common/auth/auth-user';
import { PrismaService, Tx } from '../../common/database/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import { toPublicId } from '../../common/ids/public-id';
import { AccessPolicyService } from '../access/access-policy.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { VideoProgressDto } from './dto/progress.dto';
import {
  courseProgressPercent,
  POSITION_TOLERANCE_SECONDS,
  VIDEO_COMPLETE_PERCENT,
  videoPercent,
} from './progress-rules';

export interface LessonProgressResponse {
  lessonId: string;
  lastPositionSeconds: number;
  percent: number;
  completedAt: Date | null;
}

export interface CourseProgressResponse {
  courseId: string;
  progressPercentage: number;
  completedLessonIds: string[];
  // Where to continue: the lesson touched last that is not finished, else the
  // first unfinished lesson in course order, else null when everything is done.
  resumeLessonId: string | null;
}

interface LessonRef {
  courseId: number;
  type: LessonType;
  isPreview: boolean;
  course: { id: number; visibility: CourseVisibility };
}

const lessonNotFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'LESSON_NOT_FOUND', 'Lesson not found.');

// Owns lesson_progress. Reads other modules' tables only through AccessPolicyService
// and EnrollmentsService (the enrollment becomes Completed at 100 %).
@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessPolicyService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  // ─── Student endpoints ────────────────────────────────────────────────────

  // Video heartbeat. The resume point follows the latest position, even backwards.
  // percent only goes up, and completedAt is set once, at VIDEO_COMPLETE_PERCENT.
  async reportVideoProgress(
    user: AuthUser,
    lessonId: number,
    dto: VideoProgressDto,
  ): Promise<LessonProgressResponse> {
    const lesson = await this.findLesson(lessonId);
    await this.assertCanRecord(user, lesson);
    this.assertType(lesson, ['Video'], 'Only video lessons report playback progress.');

    const { positionSeconds, durationSeconds } = dto;
    if (
      durationSeconds <= 0 ||
      positionSeconds < 0 ||
      positionSeconds > durationSeconds + POSITION_TOLERANCE_SECONDS
    ) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_PROGRESS',
        'durationSeconds must be positive and positionSeconds must be between 0 and durationSeconds.',
      );
    }
    const position = Math.min(positionSeconds, durationSeconds);
    const percent = videoPercent(position, durationSeconds);
    const where = { userId: user.id, lessonId };

    const newlyCompleted = await this.prisma.$transaction(async (tx) => {
      // Create the row if this is the first heartbeat, then raise percent and
      // completedAt with conditional updates. Each is one atomic statement, so two
      // heartbeats arriving together can never lower percent or complete twice.
      await tx.lessonProgress.createMany({
        data: [{ ...where, courseId: lesson.courseId }],
        skipDuplicates: true,
      });
      await tx.lessonProgress.update({
        where: { userId_lessonId: where },
        data: { lastPositionSeconds: position },
      });
      await tx.lessonProgress.updateMany({
        where: { ...where, percent: { lt: percent } },
        data: { percent },
      });
      if (percent < VIDEO_COMPLETE_PERCENT) return false;
      const done = await tx.lessonProgress.updateMany({
        where: { ...where, completedAt: null },
        data: { completedAt: new Date() },
      });
      return done.count > 0;
    });

    if (newlyCompleted) await this.completeCourseIfDone(user.id, lesson.courseId);
    return this.getLessonProgressRow(user.id, lessonId);
  }

  // Text and Document lessons: the student says they are done.
  async completeLesson(user: AuthUser, lessonId: number): Promise<LessonProgressResponse> {
    const lesson = await this.findLesson(lessonId);
    await this.assertCanRecord(user, lesson);
    this.assertType(
      lesson,
      ['Text', 'Document'],
      'Only text and document lessons are completed by the student. Quizzes and assignments complete when you pass or submit.',
    );
    await this.markLessonCompleted({ userId: user.id, courseId: lesson.courseId, lessonId });
    return this.getLessonProgressRow(user.id, lessonId);
  }

  async getLessonProgress(user: AuthUser, lessonId: number): Promise<LessonProgressResponse> {
    const lesson = await this.findLesson(lessonId);
    if (!(await this.access.canViewLesson(user, lesson.course, lesson))) throw lessonNotFound();
    return this.getLessonProgressRow(user.id, lessonId);
  }

  async getCourseProgress(user: AuthUser, courseId: number): Promise<CourseProgressResponse> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, visibility: true },
    });
    if (!course || !(await this.access.canViewContent(user, course))) {
      throw new AppException(HttpStatus.NOT_FOUND, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const [total, rows] = await Promise.all([
      this.prisma.lesson.count({ where: { courseId } }),
      this.prisma.lessonProgress.findMany({
        where: { userId: user.id, courseId },
        orderBy: { updatedAt: 'desc' },
        select: { lessonId: true, completedAt: true },
      }),
    ]);
    const completed = rows.filter((r) => r.completedAt !== null);
    const touched = rows.find((r) => r.completedAt === null);

    let resumeLessonId: number | null = touched?.lessonId ?? null;
    if (resumeLessonId === null && completed.length < total) {
      const next = await this.prisma.lesson.findFirst({
        where: { courseId, id: { notIn: completed.map((r) => r.lessonId) } },
        orderBy: [{ module: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        select: { id: true },
      });
      resumeLessonId = next?.id ?? null;
    }

    return {
      courseId: toPublicId('course', courseId),
      progressPercentage: courseProgressPercent(completed.length, total),
      completedLessonIds: completed.map((r) => toPublicId('lesson', r.lessonId)),
      resumeLessonId: resumeLessonId === null ? null : toPublicId('lesson', resumeLessonId),
    };
  }

  // ─── For M2 ───────────────────────────────────────────────────────────────

  // Marks a lesson done whatever its type: M2 calls this inside the quiz submit
  // transaction when an attempt passes, and when an assignment file is submitted.
  // Safe to call more than once. Returns true only the first time.
  async markLessonCompleted(
    ref: { userId: string; courseId: number; lessonId: number },
    db: Tx = this.prisma,
  ): Promise<boolean> {
    const where = { userId: ref.userId, lessonId: ref.lessonId };
    await db.lessonProgress.createMany({
      data: [{ ...where, courseId: ref.courseId }],
      skipDuplicates: true,
    });
    await db.lessonProgress.updateMany({
      where: { ...where, percent: { lt: 100 } },
      data: { percent: 100 },
    });
    const done = await db.lessonProgress.updateMany({
      where: { ...where, completedAt: null },
      data: { completedAt: new Date() },
    });
    if (done.count === 0) return false;
    await this.completeCourseIfDone(ref.userId, ref.courseId, db);
    return true;
  }

  // After lessons are deleted, students who had finished every remaining lesson
  // are now at 100 %: complete their enrollments too. Their progress rows for the
  // deleted lessons are already gone (ON DELETE CASCADE). A course left with no
  // lessons completes nobody. Called by the content module (M2) in its delete
  // transaction. Returns how many enrollments became Completed.
  async recheckCourseCompletion(courseId: number, db: Tx = this.prisma): Promise<number> {
    const total = await db.lesson.count({ where: { courseId } });
    if (total === 0) return 0;
    const perStudent = await db.lessonProgress.groupBy({
      by: ['userId'],
      where: { courseId, completedAt: { not: null } },
      _count: { _all: true },
    });
    const finished = perStudent
      .filter((s) => courseProgressPercent(s._count._all, total) === 100)
      .map((s) => s.userId);
    return this.enrollments.markCompletedMany(finished, courseId, db);
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  // At 100 % the enrollment becomes Completed (EnrollmentsService, M2).
  private async completeCourseIfDone(
    userId: string,
    courseId: number,
    db: Tx = this.prisma,
  ): Promise<void> {
    const [total, done] = await Promise.all([
      db.lesson.count({ where: { courseId } }),
      db.lessonProgress.count({ where: { userId, courseId, completedAt: { not: null } } }),
    ]);
    if (courseProgressPercent(done, total) === 100) {
      await this.enrollments.markCompleted(userId, courseId, db);
    }
  }

  private async findLesson(lessonId: number): Promise<LessonRef> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        courseId: true,
        type: true,
        isPreview: true,
        course: { select: { id: true, visibility: true } },
      },
    });
    if (!lesson) throw lessonNotFound();
    return lesson;
  }

  // Only an Active student of a published course records progress. A Completed
  // enrollment is read-only, so replaying a finished course changes nothing.
  private async assertCanRecord(user: AuthUser, lesson: LessonRef): Promise<void> {
    if (await this.access.canParticipate(user, lesson.course)) return;
    if (!(await this.access.canViewLesson(user, lesson.course, lesson))) throw lessonNotFound();
    throw new AppException(
      HttpStatus.FORBIDDEN,
      'PROGRESS_NOT_ALLOWED',
      'Only a student with an active enrollment can record progress.',
    );
  }

  private assertType(lesson: LessonRef, allowed: LessonType[], message: string): void {
    if (!allowed.includes(lesson.type)) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'LESSON_TYPE_NOT_SUPPORTED',
        message,
        [{ lessonType: lesson.type }],
      );
    }
  }

  private async getLessonProgressRow(
    userId: string,
    lessonId: number,
  ): Promise<LessonProgressResponse> {
    const row = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    return {
      lessonId: toPublicId('lesson', lessonId),
      lastPositionSeconds: row?.lastPositionSeconds ?? 0,
      percent: row?.percent ?? 0,
      completedAt: row?.completedAt ?? null,
    };
  }
}
