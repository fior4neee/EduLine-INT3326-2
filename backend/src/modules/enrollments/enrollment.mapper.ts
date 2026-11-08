import type { Enrollment } from '@prisma/client';
import { toPublicId } from '../../common/ids/public-id';

// Enrollment object (backend README §3.3).
export function toEnrollmentResponse(e: Enrollment) {
  return {
    id: toPublicId('enrollment', e.id),
    userId: e.userId,
    courseId: toPublicId('course', e.courseId),
    status: e.status,
    timesEnrolled: e.timesEnrolled,
    completedAt: e.completedAt,
    enrolledAt: e.enrolledAt,
  };
}
