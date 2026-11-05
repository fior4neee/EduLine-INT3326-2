import { Injectable } from '@nestjs/common';
import type { EnrollmentStatus, Prisma } from '@prisma/client';
import type { AuthUser } from '../../common/auth/auth-user';
import { PrismaService } from '../../common/database/prisma.service';
import { toPublicId } from '../../common/ids/public-id';
import { paginated, skipTake } from '../../common/pagination/pagination';
import { CoursesService } from '../courses/courses.service';
import { CourseStudentsQueryDto } from '../enrollments/dto/enrollment.dto';
import { courseProgressPercent, ratioPercent } from '../progress/progress-rules';
import { toUserSummary } from '../users/user.mapper';
import { UsersService } from '../users/users.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_WINDOW_DAYS = 7;

const latest = (...dates: (Date | null | undefined)[]): Date | null =>
  dates.reduce<Date | null>((max, d) => (d && (!max || d > max) ? d : max), null);

// The instructor dashboard. Read-only SQL aggregates over other modules' tables,
// never cached: this is per-course, personal data (ADR-006).
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courses: CoursesService,
    private readonly users: UsersService,
  ) {}

  async overview(user: AuthUser, courseId: number) {
    await this.courses.getManageable(user, courseId);
    const since = new Date(Date.now() - ACTIVE_WINDOW_DAYS * DAY_MS);

    const [byStatus, learners, totalLessons, doneByUser, quizzes, assignments] = await Promise.all([
      this.prisma.enrollment.groupBy({
        by: ['status'],
        where: { courseId },
        _count: { _all: true },
      }),
      this.prisma.enrollment.findMany({
        where: { courseId, status: { in: ['Active', 'Completed'] } },
        select: { userId: true, status: true },
      }),
      this.prisma.lesson.count({ where: { courseId } }),
      this.prisma.lessonProgress.groupBy({
        by: ['userId'],
        where: { courseId, completedAt: { not: null } },
        _count: { _all: true },
      }),
      this.quizStats(courseId),
      this.assignmentStats(courseId),
    ]);

    const enrollmentsByStatus: Record<EnrollmentStatus, number> = {
      Active: 0,
      Completed: 0,
      Suspended: 0,
      Dropped: 0,
    };
    for (const row of byStatus) enrollmentsByStatus[row.status] = row._count._all;

    // A Completed enrollment reads 100, as everywhere else.
    const done = new Map(doneByUser.map((d) => [d.userId, d._count._all]));
    const percents = learners.map((l) =>
      l.status === 'Completed' ? 100 : courseProgressPercent(done.get(l.userId) ?? 0, totalLessons),
    );

    return {
      courseId: toPublicId('course', courseId),
      enrollmentsByStatus,
      averageProgressPercentage:
        percents.length === 0
          ? null
          : Math.round(percents.reduce((a, b) => a + b, 0) / percents.length),
      completionRatePercentage: ratioPercent(
        enrollmentsByStatus.Completed,
        enrollmentsByStatus.Active + enrollmentsByStatus.Completed,
      ),
      activeStudentsLast7Days: await this.countActiveStudents(courseId, since),
      quizzes,
      assignments,
    };
  }

  async students(user: AuthUser, courseId: number, query: CourseStudentsQueryDto) {
    await this.courses.getManageable(user, courseId);
    const where: Prisma.EnrollmentWhereInput = { courseId, status: query.status };
    const [rows, total, totalLessons] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        orderBy: { enrolledAt: 'asc' },
        ...skipTake(query),
      }),
      this.prisma.enrollment.count({ where }),
      this.prisma.lesson.count({ where: { courseId } }),
    ]);
    const userIds = rows.map((r) => r.userId);

    const [profiles, progress, attempts, submissions] = await Promise.all([
      this.users.findSummaries(userIds),
      this.prisma.lessonProgress.groupBy({
        by: ['userId'],
        where: { courseId, userId: { in: userIds } },
        _count: { completedAt: true },
        _max: { updatedAt: true },
      }),
      this.prisma.quizAttempt.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, status: 'Submitted', quiz: { courseId } },
        _sum: { score: true, maxScore: true },
        _max: { submittedAt: true },
      }),
      this.prisma.submission.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, assignment: { courseId } },
        _count: { _all: true },
        _max: { submittedAt: true },
      }),
    ]);
    const profileBy = new Map(profiles.map((p) => [p.id, p]));
    const progressBy = new Map(progress.map((p) => [p.userId, p]));
    const attemptBy = new Map(attempts.map((a) => [a.userId, a]));
    const submissionBy = new Map(submissions.map((s) => [s.userId, s]));

    const data = rows.map((e) => {
      const p = progressBy.get(e.userId);
      const a = attemptBy.get(e.userId);
      const s = submissionBy.get(e.userId);
      return {
        student: toUserSummary(profileBy.get(e.userId)!),
        status: e.status,
        progressPercentage:
          e.status === 'Completed'
            ? 100
            : courseProgressPercent(p?._count.completedAt ?? 0, totalLessons),
        lastActivityAt: latest(p?._max.updatedAt, a?._max.submittedAt, s?._max.submittedAt),
        quizAvgScorePercentage: ratioPercent(a?._sum.score ?? 0, a?._sum.maxScore ?? 0),
        submissionsCount: s?._count._all ?? 0,
      };
    });
    return paginated(data, total, query);
  }

  // ─── Pieces ───────────────────────────────────────────────────────────────

  // Only Submitted attempts count. The average is total points earned over total
  // points possible, so a student who retakes a quiz is counted once per attempt.
  private async quizStats(courseId: number) {
    const [quizzes, rows] = await Promise.all([
      this.prisma.quiz.findMany({
        where: { courseId },
        orderBy: [{ lesson: { module: { sortOrder: 'asc' } } }, { lesson: { sortOrder: 'asc' } }],
        select: { id: true, lessonId: true, title: true },
      }),
      this.prisma.quizAttempt.groupBy({
        by: ['quizId', 'passed'],
        where: { status: 'Submitted', quiz: { courseId } },
        _count: { _all: true },
        _sum: { score: true, maxScore: true },
      }),
    ]);
    return quizzes.map((q) => {
      const mine = rows.filter((r) => r.quizId === q.id);
      const attempts = mine.reduce((n, r) => n + r._count._all, 0);
      const passed = mine.filter((r) => r.passed === true).reduce((n, r) => n + r._count._all, 0);
      const score = mine.reduce((n, r) => n + (r._sum.score ?? 0), 0);
      const maxScore = mine.reduce((n, r) => n + (r._sum.maxScore ?? 0), 0);
      return {
        quizId: toPublicId('quiz', q.id),
        lessonId: toPublicId('lesson', q.lessonId),
        title: q.title,
        attempts,
        averageScorePercentage: ratioPercent(score, maxScore),
        passRatePercentage: ratioPercent(passed, attempts),
      };
    });
  }

  private async assignmentStats(courseId: number) {
    const [assignments, rows] = await Promise.all([
      this.prisma.assignment.findMany({
        where: { courseId },
        orderBy: [{ lesson: { module: { sortOrder: 'asc' } } }, { lesson: { sortOrder: 'asc' } }],
        select: { id: true, lessonId: true, title: true },
      }),
      this.prisma.submission.groupBy({
        by: ['assignmentId', 'status', 'isLate'],
        where: { assignment: { courseId } },
        _count: { _all: true },
      }),
    ]);
    return assignments.map((a) => {
      const mine = rows.filter((r) => r.assignmentId === a.id);
      const count = (pred: (r: (typeof mine)[number]) => boolean) =>
        mine.filter(pred).reduce((n, r) => n + r._count._all, 0);
      return {
        assignmentId: toPublicId('assignment', a.id),
        lessonId: toPublicId('lesson', a.lessonId),
        title: a.title,
        submitted: count(() => true),
        graded: count((r) => r.status === 'Graded'),
        late: count((r) => r.isLate),
      };
    });
  }

  // Students who did anything in the last 7 days: watched or finished a lesson,
  // submitted a quiz, or submitted an assignment.
  private async countActiveStudents(courseId: number, since: Date): Promise<number> {
    const [lessons, attempts, submissions] = await Promise.all([
      this.prisma.lessonProgress.findMany({
        where: { courseId, updatedAt: { gte: since } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.quizAttempt.findMany({
        where: { quiz: { courseId }, submittedAt: { gte: since } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.submission.findMany({
        where: { assignment: { courseId }, submittedAt: { gte: since } },
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);
    return new Set([...lessons, ...attempts, ...submissions].map((r) => r.userId)).size;
  }
}
