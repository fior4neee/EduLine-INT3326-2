import { TextDecoder } from 'node:util';
import { parsePublicId, type EntityKind } from '../../backend/src/common/ids/public-id';
import type { EventPayloads, EventType } from '../../backend/src/events/event-types';
import type { OutboxEnvelope } from '../../backend/src/modules/notifications/notification-fanout.service';

export class PushMessageError extends Error {
  constructor(public readonly code: 'MALFORMED_MESSAGE' | 'UNSUPPORTED_EVENT') {
    // Do not include input: EMAIL_REQUESTED can contain a password-reset token.
    super(code === 'UNSUPPORTED_EVENT' ? 'Event type is not supported.' : 'Invalid Pub/Sub message.');
    this.name = 'PushMessageError';
  }
}

type SupportedEventType = Exclude<EventType, 'EMAIL_REQUESTED'>;
type RecordValue = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const MAX_DB_INT = 2_147_483_647;

function requireValid(condition: unknown): asserts condition {
  if (!condition) throw new PushMessageError('MALFORMED_MESSAGE');
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_DB_INT;
}

function isId(kind: EntityKind, value: unknown): value is string {
  return typeof value === 'string' && parsePublicId(kind, value) !== null;
}

function isoDate(value: unknown): Date {
  requireValid(typeof value === 'string');
  const date = new Date(value);
  // EventPublisher and the producers serialize dates with Date.toISOString().
  // Round-tripping also rejects impossible dates such as February 30.
  requireValid(Number.isFinite(date.getTime()) && date.toISOString() === value);
  return date;
}

const payloadChecks = {
  ENROLLMENT_CREATED(data: RecordValue) {
    requireValid(isId('enrollment', data.enrollmentId));
    requireValid(isId('course', data.courseId));
    requireValid(isUuid(data.userId));
    requireValid(isPositiveInteger(data.timesEnrolled));
  },
  COURSE_PUBLISHED(data: RecordValue) {
    requireValid(isId('course', data.courseId));
    requireValid(data.visibility === 'Public' || data.visibility === 'Restricted');
  },
  INSTRUCTOR_REQUEST_DECIDED(data: RecordValue) {
    requireValid(isUuid(data.userId));
    requireValid(data.decision === 'Approved' || data.decision === 'Rejected');
  },
  USER_REGISTERED(data: RecordValue) {
    requireValid(isUuid(data.userId));
    requireValid(typeof data.requestedInstructor === 'boolean');
  },
  ASSIGNMENT_PUBLISHED(data: RecordValue) {
    requireValid(isId('assignment', data.assignmentId));
    requireValid(isId('course', data.courseId));
  },
  ASSIGNMENT_DUE_SOON(data: RecordValue) {
    requireValid(isId('assignment', data.assignmentId));
    requireValid(isId('course', data.courseId));
    requireValid(isUuid(data.userId));
    isoDate(data.dueAt);
  },
  ASSIGNMENT_GRADED(data: RecordValue) {
    requireValid(isId('submission', data.submissionId));
    requireValid(isId('assignment', data.assignmentId));
    requireValid(isId('course', data.courseId));
    requireValid(isUuid(data.userId));
    requireValid(typeof data.maxPoints === 'number' && Number.isInteger(data.maxPoints));
    requireValid(data.maxPoints >= 0 && data.maxPoints <= MAX_DB_INT);
    requireValid(typeof data.score === 'number' && Number.isFinite(data.score));
    requireValid(data.score >= 0 && data.score <= data.maxPoints);
  },
  SUBMISSION_COMMENTED(data: RecordValue) {
    requireValid(isPositiveInteger(data.commentId));
    requireValid(isId('submission', data.submissionId));
    requireValid(isId('assignment', data.assignmentId));
    requireValid(isId('course', data.courseId));
    requireValid(isUuid(data.authorId) && isUuid(data.studentId));
  },
  COURSE_COMPLETED(data: RecordValue) {
    requireValid(isId('enrollment', data.enrollmentId));
    requireValid(isId('course', data.courseId));
    requireValid(isUuid(data.userId));
  },
} satisfies Record<SupportedEventType, (data: RecordValue) => void>;

/** Decode only; the caller must not acknowledge until the DB transaction commits. */
export function parsePushMessage(body: unknown): { event: OutboxEnvelope; messageId: string } {
  requireValid(isRecord(body) && isRecord(body.message));
  const message = body.message;
  requireValid(typeof message.messageId === 'string' && message.messageId.trim().length > 0);
  requireValid(typeof message.data === 'string' && message.data.length > 0);
  requireValid(BASE64.test(message.data));

  const bytes = Buffer.from(message.data, 'base64');
  // Buffer.from is permissive; reject non-canonical encodings and padding bits.
  requireValid(bytes.toString('base64') === message.data);
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new PushMessageError('MALFORMED_MESSAGE');
  }
  requireValid(isRecord(decoded));
  requireValid(isUuid(decoded.eventId));
  requireValid(typeof decoded.type === 'string');
  const occurredAt = isoDate(decoded.occurredAt);
  requireValid(isRecord(decoded.data));

  // Never let the existing fanout's warning-and-return default ACK an event
  // whose work is not implemented by this notification-only worker.
  if (!Object.hasOwn(payloadChecks, decoded.type)) {
    throw new PushMessageError('UNSUPPORTED_EVENT');
  }
  const type = decoded.type as SupportedEventType;
  payloadChecks[type](decoded.data);

  if (message.attributes !== undefined) {
    requireValid(isRecord(message.attributes));
    const { eventId, type: attributeType } = message.attributes;
    requireValid(eventId === undefined || eventId === decoded.eventId);
    requireValid(attributeType === undefined || attributeType === type);
  }

  return {
    messageId: message.messageId,
    event: {
      eventId: decoded.eventId,
      type,
      occurredAt,
      data: decoded.data as unknown as EventPayloads[SupportedEventType],
    },
  };
}
