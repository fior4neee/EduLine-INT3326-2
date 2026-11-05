import type { EnrollmentStatus, User } from '@prisma/client';
import { toPublicId } from '../../common/ids/public-id';

export interface EnrolledCourseSummary {
  courseId: number;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt: Date | null;
  // From M3's CourseProgressService. Absent means not started.
  progressPercentage?: number;
}

// A Completed enrollment always reads 100, even if the instructor has added
// lessons since. Otherwise the share of lessons the student has finished.
export function progressPercentage(
  e: Pick<EnrolledCourseSummary, 'status' | 'progressPercentage'>,
): number {
  return e.status === 'Completed' ? 100 : (e.progressPercentage ?? 0);
}

// User object (backend README §3.1). Never includes passwordHash.
// enrolledCourses is included only when the caller passes it (the /users/me family).
export function toUserResponse(user: User, enrolled?: EnrolledCourseSummary[]) {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    accountType: user.accountType,
    description: user.description,
    isVerified: user.isVerified,
    instructorRequestStatus: user.instructorRequestStatus,
    ...(enrolled && {
      enrolledCourses: enrolled.map((e) => ({
        courseId: toPublicId('course', e.courseId),
        status: e.status,
        enrolledAt: e.enrolledAt,
        progressPercentage: progressPercentage(e),
      })),
    }),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export type UserResponse = ReturnType<typeof toUserResponse>;

// Minimal profile shown to course staff, e.g. in a course's student list.
export function toUserSummary(
  user: Pick<User, 'id' | 'username' | 'firstName' | 'lastName' | 'email'>,
) {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  };
}
