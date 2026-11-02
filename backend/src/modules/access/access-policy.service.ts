import { HttpStatus, Injectable } from '@nestjs/common';
import type { Course, CourseVisibility, EnrollmentStatus } from '@prisma/client';
import type { AuthUser } from '../../common/auth/auth-user';
import { PrismaService } from '../../common/database/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import { toPublicId } from '../../common/ids/public-id';
import { verifySecret } from '../../common/security/hashing';

export type CourseRef = Pick<Course, 'id' | 'visibility'>;
export type EnrollableCourse = Pick<
  Course,
  'id' | 'visibility' | 'enrollmentOpensAt' | 'enrollmentClosesAt' | 'accessPasswordHash'
>;

const PUBLISHED: readonly CourseVisibility[] = ['Public', 'Restricted'];

export function isPublished(visibility: CourseVisibility): boolean {
  return PUBLISHED.includes(visibility);
}

// Every course-level authorization rule, in one place (docs/rbac-matrix.md §2).
// It is the one shared service allowed to read course_instructors,
// course_prerequisites and enrollments directly, so all modules apply the same rules.
//
// Enrollment status meaning:
//   Active    – full access: content, quizzes, assignments
//   Completed – read-only: content and own results, no new attempts or submissions
//   Suspended – no access to the course
//   Dropped   – no access until re-enrolled
@Injectable()
export class AccessPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  // Admin, or an Instructor listed on the course.
  async isCourseStaff(user: AuthUser | undefined, courseId: number): Promise<boolean> {
    if (!user) return false;
    if (user.accountType === 'Admin') return true;
    if (user.accountType !== 'Instructor') return false;
    const row = await this.prisma.courseInstructor.findUnique({
      where: { courseId_instructorId: { courseId, instructorId: user.id } },
      select: { courseId: true },
    });
    return row !== null;
  }

  async assertCourseStaff(user: AuthUser, courseId: number): Promise<void> {
    if (!(await this.isCourseStaff(user, courseId))) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'COURSE_STAFF_ONLY',
        'Only instructors of this course or an Admin can do this.',
      );
    }
  }

  getEnrollment(user: AuthUser | undefined, courseId: number) {
    if (!user) return Promise.resolve(null);
    return this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { id: true, status: true, timesEnrolled: true, completedAt: true },
    });
  }

  async enrollmentStatus(
    user: AuthUser | undefined,
    courseId: number,
  ): Promise<EnrollmentStatus | null> {
    if (!user) return null;
    const row = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { status: true },
    });
    return row?.status ?? null;
  }

  // May this caller know the course exists? If not, the API answers 404.
  async canSeeCourse(user: AuthUser | undefined, course: CourseRef): Promise<boolean> {
    if (isPublished(course.visibility)) return true;
    if (await this.isCourseStaff(user, course.id)) return true;
    if (course.visibility === 'Archived') {
      const status = await this.enrollmentStatus(user, course.id);
      return status === 'Active' || status === 'Completed';
    }
    return false;
  }

  // Lessons, videos, documents.
  async canViewContent(user: AuthUser | undefined, course: CourseRef): Promise<boolean> {
    if (!user) return false;
    if (await this.isCourseStaff(user, course.id)) return true;
    if (course.visibility === 'Draft') return false;
    const status = await this.enrollmentStatus(user, course.id);
    return status === 'Active' || status === 'Completed';
  }

  // A preview lesson is open to anyone who can see a published course,
  // except a student suspended from it.
  async canViewLesson(
    user: AuthUser | undefined,
    course: CourseRef,
    lesson: { isPreview: boolean },
  ): Promise<boolean> {
    if (lesson.isPreview && isPublished(course.visibility)) {
      return (await this.enrollmentStatus(user, course.id)) !== 'Suspended';
    }
    return this.canViewContent(user, course);
  }

  // Start a quiz attempt, save answers, submit an assignment.
  async canParticipate(user: AuthUser, course: CourseRef): Promise<boolean> {
    if (user.accountType !== 'Student' || !isPublished(course.visibility)) return false;
    return (await this.enrollmentStatus(user, course.id)) === 'Active';
  }

  // A student's own quiz results, submissions and grades.
  async canViewOwnResults(user: AuthUser, course: CourseRef): Promise<boolean> {
    if (await this.isCourseStaff(user, course.id)) return true;
    const status = await this.enrollmentStatus(user, course.id);
    return status === 'Active' || status === 'Completed';
  }

  // Course-side enrollment rules: published, enrollment window, prerequisites,
  // course password. The caller's own enrollment state (already enrolled,
  // suspended) is checked by EnrollmentsService.
  async assertEnrollmentRules(
    user: AuthUser,
    course: EnrollableCourse,
    coursePassword: string | undefined,
    now = new Date(),
  ): Promise<void> {
    if (!isPublished(course.visibility)) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'COURSE_NOT_OPEN',
        'This course is not open for enrollment.',
      );
    }
    if (course.enrollmentOpensAt && now < course.enrollmentOpensAt) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ENROLLMENT_NOT_OPEN_YET',
        'Enrollment for this course has not opened yet.',
        [{ enrollmentOpensAt: course.enrollmentOpensAt }],
      );
    }
    if (course.enrollmentClosesAt && now > course.enrollmentClosesAt) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ENROLLMENT_CLOSED',
        'Enrollment for this course has closed.',
        [{ enrollmentClosesAt: course.enrollmentClosesAt }],
      );
    }

    const prerequisites = await this.prisma.coursePrerequisite.findMany({
      where: { courseId: course.id },
      select: { prerequisiteCourseId: true },
    });
    if (prerequisites.length > 0) {
      const ids = prerequisites.map((p) => p.prerequisiteCourseId);
      const completed = await this.prisma.enrollment.findMany({
        where: { userId: user.id, courseId: { in: ids }, status: 'Completed' },
        select: { courseId: true },
      });
      const done = new Set(completed.map((e) => e.courseId));
      const missing = ids.filter((id) => !done.has(id));
      if (missing.length > 0) {
        throw new AppException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'PREREQUISITES_NOT_MET',
          'Complete the prerequisite courses first.',
          [{ missingCourseIds: missing.map((id) => toPublicId('course', id)) }],
        );
      }
    }

    if (course.visibility === 'Restricted') {
      const ok =
        !!coursePassword &&
        !!course.accessPasswordHash &&
        (await verifySecret(course.accessPasswordHash, coursePassword));
      if (!ok) {
        throw new AppException(
          HttpStatus.FORBIDDEN,
          'INVALID_COURSE_PASSWORD',
          'The course password is missing or wrong.',
        );
      }
    }
  }
}
