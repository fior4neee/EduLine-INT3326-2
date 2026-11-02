// Event contracts written to the outbox and later published to Pub/Sub.
// Envelope sent to consumers: { eventId, type, occurredAt, data } where
// eventId = OutboxEvent.id and occurredAt = OutboxEvent.createdAt.
// Consumers must dedupe on eventId (Pub/Sub delivers at least once).

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
  // Picked up by the worker's email handler (M6).
  EMAIL_REQUESTED: {
    to: string;
    template: 'password-reset';
    data: Record<string, string>;
  };
}

export type EventType = keyof EventPayloads;
