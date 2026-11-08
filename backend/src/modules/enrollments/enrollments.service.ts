import { HttpStatus, Injectable } from '@nestjs/common';
import { Enrollment, Prisma } from '@prisma/client';
import type { AuthUser } from '../../common/auth/auth-user';
import { PrismaService, Tx } from '../../common/database/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import { toPublicId } from '../../common/ids/public-id';
import { paginated, PaginationQueryDto, skipTake } from '../../common/pagination/pagination';
import { OutboxService } from '../../events/outbox.service';
import { AccessPolicyService } from '../access/access-policy.service';
import { CoursesService } from '../courses/courses.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CourseProgressService } from '../progress/course-progress.service';
import { EnrolledCourseSummary, progressPercentage, toUserSummary } from '../users/user.mapper';
import { UsersService } from '../users/users.service';
import { CourseStudentsQueryDto } from './dto/enrollment.dto';
import { toEnrollmentResponse } from './enrollment.mapper';

const courseNotFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'COURSE_NOT_FOUND', 'Course not found.');

// Owns the enrollments table.
@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessPolicyService,
    private readonly courses: CoursesService,
    private readonly users: UsersService,
    private readonly outbox: OutboxService,
    private readonly progress: CourseProgressService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Student actions ──────────────────────────────────────────────────────

  // New enrollment, or re-activates a Dropped one (timesEnrolled + 1).
  async enroll(
    user: AuthUser,
    courseId: number,
    coursePassword?: string,
    notifications?: 'Granted' | 'Denied',
  ): Promise<Enrollment> {
    const course = await this.courses.findById(courseId);
    if (!course || !(await this.access.canSeeCourse(user, course))) throw courseNotFound();

    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (existing?.status === 'Active' || existing?.status === 'Completed') {
      throw new AppException(
        HttpStatus.CONFLICT,
        'ALREADY_ENROLLED',
        existing.status === 'Completed'
          ? 'You have already completed this course.'
          : 'You are already enrolled in this course.',
      );
    }
    if (existing?.status === 'Suspended') {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'ENROLLMENT_SUSPENDED',
        'You are suspended from this course.',
      );
    }

    await this.access.assertEnrollmentRules(user, course, coursePassword);

    return this.prisma.$transaction(async (tx) => {
      let enrollment: Enrollment;
      if (existing) {
        // Conditional update: only one of two concurrent re-enrolls succeeds.
        const reactivated = await tx.enrollment.updateMany({
          where: { id: existing.id, status: 'Dropped' },
          data: { status: 'Active', timesEnrolled: { increment: 1 }, enrolledAt: new Date() },
        });
        if (reactivated.count === 0) {
          throw new AppException(
            HttpStatus.CONFLICT,
            'ALREADY_ENROLLED',
            'You are already enrolled in this course.',
          );
        }
        enrollment = await tx.enrollment.findUniqueOrThrow({ where: { id: existing.id } });
      } else {
        try {
          enrollment = await tx.enrollment.create({ data: { userId: user.id, courseId } });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            throw new AppException(
              HttpStatus.CONFLICT,
              'ALREADY_ENROLLED',
              'You are already enrolled in this course.',
            );
          }
          throw e;
        }
      }
      if (notifications) {
        await this.notifications.setSubscription(tx, user.id, courseId, notifications);
      }
      await this.outbox.add(tx, 'ENROLLMENT_CREATED', {
        enrollmentId: toPublicId('enrollment', enrollment.id),
        courseId: toPublicId('course', courseId),
        userId: user.id,
        timesEnrolled: enrollment.timesEnrolled,
      });
      return enrollment;
    });
  }

  // Active → Dropped. Completed and Suspended enrollments cannot be dropped
  // (dropping would otherwise be a way around a suspension).
  async drop(user: AuthUser, courseId: number): Promise<void> {
    const dropped = await this.prisma.enrollment.updateMany({
      where: { userId: user.id, courseId, status: 'Active' },
      data: { status: 'Dropped' },
    });
    if (dropped.count > 0) return;

    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { status: true },
    });
    if (!existing || existing.status === 'Dropped') {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'NOT_ENROLLED',
        'You are not enrolled in this course.',
      );
    }
    throw new AppException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'CANNOT_DROP',
      `A ${existing.status} enrollment cannot be dropped.`,
    );
  }

  // "My Courses": every course the caller is enrolled in, except Dropped ones.
  async listMine(user: AuthUser, query: PaginationQueryDto) {
    const where: Prisma.EnrollmentWhereInput = { userId: user.id, status: { not: 'Dropped' } };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.enrollment.findMany({
        where,
        orderBy: { enrolledAt: 'desc' },
        ...skipTake(query),
      }),
      this.prisma.enrollment.count({ where }),
    ]);
    const presented = await this.courses.present(
      await this.courses.findManyWithLinks(rows.map((e) => e.courseId)),
    );
    const courses = new Map(presented.map((c) => [c.id, c]));
    const progress = await this.progress.getCourseProgressMap(
      user.id,
      rows.map((e) => e.courseId),
    );
    const data = rows.map((e) => ({
      enrollment: toEnrollmentResponse(e),
      course: courses.get(toPublicId('course', e.courseId))!,
      progressPercentage: progressPercentage({
        status: e.status,
        progressPercentage: progress.get(e.courseId),
      }),
    }));
    return paginated(data, total, query);
  }

  // Used by /users/me to build enrolledCourses.
  async findSummariesForUser(userId: string): Promise<EnrolledCourseSummary[]> {
    const rows = await this.prisma.enrollment.findMany({
      where: { userId, status: { not: 'Dropped' } },
      orderBy: { enrolledAt: 'desc' },
      select: { courseId: true, status: true, enrolledAt: true, completedAt: true },
    });
    const progress = await this.progress.getCourseProgressMap(
      userId,
      rows.map((e) => e.courseId),
    );
    return rows.map((e) => ({ ...e, progressPercentage: progress.get(e.courseId) }));
  }

  // ─── Staff actions ────────────────────────────────────────────────────────

  async listStudents(user: AuthUser, courseId: number, query: CourseStudentsQueryDto) {
    await this.courses.getManageable(user, courseId);
    const where: Prisma.EnrollmentWhereInput = { courseId, status: query.status };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.enrollment.findMany({
        where,
        orderBy: { enrolledAt: 'asc' },
        ...skipTake(query),
      }),
      this.prisma.enrollment.count({ where }),
    ]);
    const students = new Map(
      (await this.users.findSummaries(rows.map((e) => e.userId))).map((u) => [u.id, u]),
    );
    const data = rows.map((e) => ({
      enrollment: toEnrollmentResponse(e),
      student: toUserSummary(students.get(e.userId)!),
    }));
    return paginated(data, total, query);
  }

  // Suspend: only a student who enrolled at least twice and never completed
  // the course (backend README §3.3). Un-suspend: Suspended → Active.
  async setStatus(
    user: AuthUser,
    enrollmentId: number,
    status: 'Suspended' | 'Active',
  ): Promise<Enrollment> {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) {
      throw new AppException(HttpStatus.NOT_FOUND, 'ENROLLMENT_NOT_FOUND', 'Enrollment not found.');
    }
    await this.access.assertCourseStaff(user, enrollment.courseId);

    const where: Prisma.EnrollmentWhereInput =
      status === 'Suspended'
        ? {
            id: enrollmentId,
            status: { in: ['Active', 'Dropped'] },
            timesEnrolled: { gte: 2 },
            completedAt: null,
          }
        : { id: enrollmentId, status: 'Suspended' };

    const updated = await this.prisma.enrollment.updateMany({ where, data: { status } });
    if (updated.count === 0) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        status === 'Suspended' ? 'SUSPENSION_NOT_ALLOWED' : 'NOT_SUSPENDED',
        status === 'Suspended'
          ? 'Only a student who enrolled at least twice and never completed the course can be suspended.'
          : 'This enrollment is not suspended.',
      );
    }
    return this.prisma.enrollment.findUniqueOrThrow({ where: { id: enrollmentId } });
  }

  // ─── For M3's progress module ─────────────────────────────────────────────

  // Call when a student's progress reaches 100 %. Safe to call more than once.
  // Pass the caller's transaction to make it part of that transaction.
  async markCompleted(userId: string, courseId: number, db: Tx = this.prisma): Promise<void> {
    await this.markCompletedMany([userId], courseId, db);
  }

  // Same for several students at once, e.g. after a lesson is deleted.
  // Returns how many Active enrollments became Completed. Each one that changes
  // writes COURSE_COMPLETED (→ "course completed" notification) in the same
  // transaction, and only once even if two requests complete it at the same time.
  async markCompletedMany(userIds: string[], courseId: number, db: Tx = this.prisma): Promise<number> {
    if (userIds.length === 0) return 0;
    const run = async (tx: Tx) => {
      const candidates = await tx.enrollment.findMany({
        where: { userId: { in: userIds }, courseId, status: 'Active' },
        select: { id: true, userId: true },
      });
      let completed = 0;
      for (const e of candidates) {
        const changed = await tx.enrollment.updateMany({
          where: { id: e.id, status: 'Active' },
          data: { status: 'Completed', completedAt: new Date() },
        });
        if (changed.count === 0) continue;
        completed++;
        await this.outbox.add(tx, 'COURSE_COMPLETED', {
          enrollmentId: toPublicId('enrollment', e.id),
          courseId: toPublicId('course', courseId),
          userId: e.userId,
        });
      }
      return completed;
    };
    // Already inside the caller's transaction, or start one.
    return db === this.prisma ? this.prisma.$transaction(run) : run(db);
  }
}
