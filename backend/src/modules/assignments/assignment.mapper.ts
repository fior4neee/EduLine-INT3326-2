import type { Assignment, Submission, SubmissionComment, User } from '@prisma/client';
import { toPublicId } from '../../common/ids/public-id';
import type { SubmissionState } from './assignment-rules';

// Assignment object (backend README §3.7). `locked` = before unlockAt, when a
// student sees the title and dates only.
export function toAssignmentResponse(a: Assignment, opts: { locked?: boolean } = {}) {
  return {
    id: toPublicId('assignment', a.id),
    lessonId: toPublicId('lesson', a.lessonId),
    courseId: toPublicId('course', a.courseId),
    title: a.title,
    instructions: opts.locked ? null : a.instructions,
    maxPoints: a.maxPoints,
    submissionTypes: a.submissionTypes,
    allowedExtensions: a.allowedExtensions,
    unlockAt: a.unlockAt,
    dueAt: a.dueAt,
    allowLateSubmissions: a.allowLateSubmissions,
    // Signed download links for attachmentKeys arrive with file storage (phase 3).
    attachments: [] as string[],
    publishedAt: a.publishedAt,
    isPublished: a.publishedAt !== null,
    locked: Boolean(opts.locked),
  };
}

// Submission object (backend README §3.8). fileKey is never sent.
export function toSubmissionResponse(s: Submission) {
  return {
    id: toPublicId('submission', s.id),
    assignmentId: toPublicId('assignment', s.assignmentId),
    userId: s.userId,
    textBody: s.textBody,
    fileName: s.fileName,
    sizeBytes: s.sizeBytes,
    mimeType: s.mimeType,
    status: s.status,
    isLate: s.isLate,
    score: s.score,
    feedback: s.feedback,
    gradedById: s.gradedById,
    submittedAt: s.submittedAt,
    gradedAt: s.gradedAt,
  };
}

export type SubmissionResponse = ReturnType<typeof toSubmissionResponse>;

export function toCommentResponse(
  c: SubmissionComment & { author: Pick<User, 'id' | 'firstName' | 'lastName' | 'accountType'> },
) {
  return {
    id: c.id,
    submissionId: toPublicId('submission', c.submissionId),
    author: {
      id: c.author.id,
      firstName: c.author.firstName,
      lastName: c.author.lastName,
      accountType: c.author.accountType,
    },
    body: c.body,
    createdAt: c.createdAt,
  };
}

export interface StudentView {
  submissionState: SubmissionState;
  mySubmission: SubmissionResponse | null;
  // Why the student cannot submit right now, or null when they can.
  submitBlockedReason: string | null;
}
