import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { EventPayloads, EventType } from '../../backend/src/events/event-types';
import { parsePushMessage, PushMessageError } from '../src/push-message';

const eventId = 'ad2638c9-1425-44c8-aa90-a4166654d010';
const userId = '6086bcee-71f1-424f-b9e2-166bb4fc4946';
const occurredAt = '2026-11-12T12:30:00.000Z';

const payloads = {
  ENROLLMENT_CREATED: { enrollmentId: 'enr_1', courseId: 'crs_2', userId, timesEnrolled: 1 },
  COURSE_PUBLISHED: { courseId: 'crs_2', visibility: 'Public' },
  INSTRUCTOR_REQUEST_DECIDED: { userId, decision: 'Approved' },
  USER_REGISTERED: { userId, requestedInstructor: false },
  ASSIGNMENT_PUBLISHED: { assignmentId: 'asg_3', courseId: 'crs_2' },
  ASSIGNMENT_DUE_SOON: { assignmentId: 'asg_3', courseId: 'crs_2', userId, dueAt: occurredAt },
  ASSIGNMENT_GRADED: {
    submissionId: 'sub_4', assignmentId: 'asg_3', courseId: 'crs_2', userId, score: 8, maxPoints: 10,
  },
  SUBMISSION_COMMENTED: {
    commentId: 5, submissionId: 'sub_4', assignmentId: 'asg_3', courseId: 'crs_2',
    authorId: userId, studentId: userId,
  },
  COURSE_COMPLETED: { enrollmentId: 'enr_1', courseId: 'crs_2', userId },
} satisfies { [Type in Exclude<EventType, 'EMAIL_REQUESTED'>]: EventPayloads[Type] };

function wrap(event: unknown) {
  return { message: { messageId: 'pubsub-message-1', data: Buffer.from(JSON.stringify(event)).toString('base64') } };
}

function envelope(type = 'USER_REGISTERED', data: unknown = payloads.USER_REGISTERED) {
  return { eventId, type, occurredAt, data };
}

function rejects(body: unknown, code: PushMessageError['code'] = 'MALFORMED_MESSAGE') {
  assert.throws(() => parsePushMessage(body), (error: unknown) =>
    error instanceof PushMessageError && error.code === code);
}

for (const [type, data] of Object.entries(payloads)) {
  test(`decodes the existing ${type} contract`, () => {
    const result = parsePushMessage(wrap(envelope(type, data)));
    assert.equal(result.messageId, 'pubsub-message-1');
    assert.equal(result.event.eventId, eventId);
    assert.equal(result.event.type, type);
    assert.deepEqual(result.event.data, data);
    assert.equal(result.event.occurredAt.toISOString(), occurredAt);
  });

  test(`${type} rejects every missing required payload field`, () => {
    for (const field of Object.keys(data)) {
      const incomplete: Record<string, unknown> = { ...data };
      delete incomplete[field];
      rejects(wrap(envelope(type, incomplete)));
    }
  });
}

test('uses eventId for the envelope independently of the Pub/Sub messageId', () => {
  const body = wrap(envelope());
  const first = parsePushMessage(body);
  body.message.messageId = 'redelivery-with-a-new-message-id';
  const second = parsePushMessage(body);
  assert.deepEqual(first.event, second.event);
  assert.notEqual(first.messageId, second.messageId);
});

test('accepts additional fields without changing the existing payload', () => {
  const data = { ...payloads.USER_REGISTERED, extra: 'forward-compatible' };
  assert.deepEqual(parsePushMessage(wrap({ ...envelope('USER_REGISTERED', data), version: 1 })).event.data, data);
});

test('validates matching attributes when present', () => {
  const body = { ...wrap(envelope()), message: { ...wrap(envelope()).message, attributes: { eventId, type: 'USER_REGISTERED' } } };
  assert.equal(parsePushMessage(body).event.eventId, eventId);
  rejects({ message: { ...body.message, attributes: { eventId: 'different-event' } } });
  rejects({ message: { ...body.message, attributes: { type: 'COURSE_PUBLISHED' } } });
  rejects({ message: { ...body.message, attributes: [] } });
});

test('rejects unwrapped messages and invalid wrappers', () => {
  for (const body of [null, [], {}, envelope(), { message: [] }, { message: {} },
    { message: { data: wrap(envelope()).message.data, messageId: '' } }]) rejects(body);
});

test('rejects invalid or noncanonical base64, invalid UTF-8 and invalid JSON', () => {
  for (const data of ['', '!!!', 'e30', 'e30=\n', 'Zh==', Buffer.from([0xff]).toString('base64'),
    Buffer.from('{not-json}').toString('base64')]) {
    rejects({ message: { messageId: '1', data } });
  }
});

test('rejects invalid envelope IDs, dates and data', () => {
  for (const event of [null, [], { ...envelope(), eventId: 't-1' },
    { ...envelope(), occurredAt: '2026-02-30T12:30:00.000Z' },
    { ...envelope(), occurredAt: 'not-a-date' }, { ...envelope(), occurredAt: 0 },
    { ...envelope(), data: [] }, { ...envelope(), data: null }, { ...envelope(), type: 123 }]) {
    rejects(wrap(event));
  }
});

test('rejects wrong ID kinds, numeric IDs, invalid UUIDs and invalid numeric payloads', () => {
  const graded = payloads.ASSIGNMENT_GRADED;
  for (const patch of [{ assignmentId: 'crs_3' }, { submissionId: 'sub_0' }, { courseId: 2 },
    { courseId: 'crs_2147483648' }, { userId: 'user-1' }, { score: '8.5' },
    { score: -1 }, { score: 11 }, { maxPoints: -1 }, { maxPoints: 1.5 }]) {
    rejects(wrap(envelope('ASSIGNMENT_GRADED', { ...graded, ...patch })));
  }
  rejects(wrap(envelope('ENROLLMENT_CREATED', { ...payloads.ENROLLMENT_CREATED, timesEnrolled: 0 })));
  rejects(wrap(envelope('SUBMISSION_COMMENTED', { ...payloads.SUBMISSION_COMMENTED, commentId: -1 })));
  rejects(wrap(envelope('USER_REGISTERED', { userId, requestedInstructor: 'false' })));
  rejects(wrap(envelope('COURSE_PUBLISHED', { courseId: 'crs_2', visibility: 'Draft' })));
  rejects(wrap(envelope('INSTRUCTOR_REQUEST_DECIDED', { userId, decision: 'Pending' })));
});

test('accepts the string ID forms understood by the existing public-id parser', () => {
  const data = { ...payloads.ASSIGNMENT_PUBLISHED, assignmentId: '3', courseId: '2' };
  assert.deepEqual(parsePushMessage(wrap(envelope('ASSIGNMENT_PUBLISHED', data))).event.data, data);
});

test('accepts zero-point assignments allowed by the existing assignment DTO', () => {
  const data = { ...payloads.ASSIGNMENT_GRADED, score: 0, maxPoints: 0 };
  assert.deepEqual(parsePushMessage(wrap(envelope('ASSIGNMENT_GRADED', data))).event.data, data);
});

test('never accepts EMAIL_REQUESTED, unknown types or inherited object keys', () => {
  for (const type of ['EMAIL_REQUESTED', 'FUTURE_EVENT', 'toString', '__proto__']) {
    rejects(wrap(envelope(type, { secret: 'password-reset-token' })), 'UNSUPPORTED_EVENT');
  }
});

test('error details never echo input or password-reset information', () => {
  assert.throws(() => parsePushMessage(wrap(envelope('EMAIL_REQUESTED', { resetUrl: 'secret-token' }))),
    (error: unknown) => error instanceof PushMessageError &&
      !error.message.includes('secret-token') && !error.message.includes('EMAIL_REQUESTED'));
});
