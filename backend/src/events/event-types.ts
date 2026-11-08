// Event contracts written to the outbox. The API's OutboxProcessor handles them
// (notifications) and, later, publishes slow external work to Pub/Sub.
// Envelope: { eventId, type, occurredAt, data } where eventId = OutboxEvent.id
// and occurredAt = OutboxEvent.createdAt. Handlers must be idempotent: an event
// can be handled again after a crash.

export interface EventPayloads {
  ENROLLMENT_CREATED: {
    enrollmentId: string;
    courseId: string;
    userId: string;
    timesEnrolled: number;
  };
  COURSE_PUBLISHED: {
    courseId: string;
    visibility: 'Public' | 'Restricted';
  };
  INSTRUCTOR_REQUEST_DECIDED: {
    userId: string;
    decision: 'Approved' | 'Rejected';
  };
  // A new account was created through the register form (→ welcome notification).
  USER_REGISTERED: {
    userId: string;
    requestedInstructor: boolean;
  };
  ASSIGNMENT_PUBLISHED: {
    assignmentId: string;
    courseId: string;
  };
  // Written by the reminder job, one per student per assignment per due date.
  ASSIGNMENT_DUE_SOON: {
    assignmentId: string;
    courseId: string;
    userId: string;
    dueAt: string;
  };
  ASSIGNMENT_GRADED: {
    submissionId: string;
    assignmentId: string;
    courseId: string;
    userId: string;
    score: number;
    maxPoints: number;
  };
  SUBMISSION_COMMENTED: {
    commentId: number;
    submissionId: string;
    assignmentId: string;
    courseId: string;
    authorId: string;
    studentId: string;
  };
  // An enrollment became Completed (all lessons done, or lessons deleted).
  COURSE_COMPLETED: {
    enrollmentId: string;
    courseId: string;
    userId: string;
  };
  // Picked up by the worker's email handler (M6).
  EMAIL_REQUESTED: {
    to: string;
    template: 'password-reset';
    data: Record<string, string>;
  };
}

export type EventType = keyof EventPayloads;
