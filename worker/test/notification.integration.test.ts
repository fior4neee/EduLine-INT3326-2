import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { after, before, describe, it } from 'node:test';
import type { AccountType, User } from '@prisma/client';
import type { EventPayloads, EventType } from '../../backend/src/events/event-types';
import { AccessPolicyService } from '../../backend/src/modules/access/access-policy.service';
import { NotificationsService } from '../../backend/src/modules/notifications/notifications.service';
import { createNotificationHandler } from '../src/notification-handler';
import { createWorkerServer } from '../src/server';

// Never truncate a shared database: fixtures have random IDs and cleanup is scoped
// to the records created by this suite. Still require an explicitly local test DB.
function assertTestDatabase(): void {
  const value = process.env.DATABASE_URL;
  assert.ok(value, 'Set DATABASE_URL to a local PostgreSQL database ending in _test.');
  const url = new URL(value);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Use a local test database.');
  assert.ok(decodeURIComponent(url.pathname.slice(1)).endsWith('_test'), 'Database name must end in _test.');
  assert.ok(!url.searchParams.has('host'), 'Socket/host overrides are not allowed in integration tests.');
}

function event<T extends EventType>(type: T, data: EventPayloads[T]) {
  return { eventId: randomUUID(), type, occurredAt: new Date().toISOString(), data };
}

describe('Notification Worker with PostgreSQL and existing backend services', { concurrency: false }, () => {
  let runtime: ReturnType<typeof createNotificationHandler> | undefined;
  let server: Server | undefined;
  let baseUrl: string;
  let reader: NotificationsService;
  let instructor: User;
  let student: User;
  let allowed: User;
  let alsoAllowed: User;
  let denied: User;
  let suspended: User;
  let courseId: number;
  let courseSlug: string;
  let lessonId: number;
  let assignmentId: number;
  let submissionId: number;
  let studentEnrollmentId: number;
  const users: string[] = [];
  const courses: number[] = [];
  const outboxIds: string[] = [];
  const db = () => {
    assert.ok(runtime);
    return runtime.prisma;
  };

  async function createUser(accountType: AccountType = 'Student', id = randomUUID()): Promise<User> {
    const user = await db().user.create({
      data: {
        id,
        username: `worker_${id}`,
        email: `${id}@worker.test`,
        firstName: 'Worker',
        lastName: 'Test',
        passwordHash: 'unused-test-password-hash',
        accountType,
      },
    });
    users.push(user.id);
    return user;
  }

  async function push(payload: unknown, messageId = randomUUID()): Promise<number> {
    const response = await fetch(`${baseUrl}/pubsub/notifications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          messageId,
          data: Buffer.from(JSON.stringify(payload)).toString('base64'),
        },
        subscription: 'projects/local-test/subscriptions/notifications-worker',
      }),
    });
    await response.arrayBuffer();
    return response.status;
  }

  async function recipients(eventId: string): Promise<string[]> {
    const rows = await db().notification.findMany({
      where: { sourceEventId: eventId },
      select: { recipientId: true },
    });
    return rows.map((row) => row.recipientId).sort();
  }

  const gradeEvent = () => event('ASSIGNMENT_GRADED', {
    submissionId: `sub_${submissionId}`,
    assignmentId: `asg_${assignmentId}`,
    courseId: `crs_${courseId}`,
    userId: student.id,
    score: 85,
    maxPoints: 100,
  });

  before(async () => {
    assertTestDatabase();
    runtime = createNotificationHandler();
    await runtime.health();
    reader = new NotificationsService(db(), new AccessPolicyService(db()));
    instructor = await createUser('Instructor');
    student = await createUser();
    allowed = await createUser();
    alsoAllowed = await createUser();
    denied = await createUser();
    suspended = await createUser();
    courseSlug = `worker-test-${randomUUID()}`;
    const course = await db().course.create({
      data: {
        title: 'Worker integration course',
        slug: courseSlug,
        difficultyLevel: 'College',
        visibility: 'Public',
        welcomeMessage: 'Welcome from the existing backend handler.',
        hasCertificate: true,
        instructors: { create: { instructorId: instructor.id } },
      },
    });
    courseId = course.id;
    courses.push(courseId);
    const module = await db().module.create({
      data: { courseId, title: 'Module', sortOrder: 1 },
    });
    const lesson = await db().lesson.create({
      data: { courseId, moduleId: module.id, title: 'Assignment lesson', slug: 'assignment', type: 'Assignment', sortOrder: 1 },
    });
    lessonId = lesson.id;
    const assignment = await db().assignment.create({
      data: {
        courseId,
        lessonId,
        title: 'Notification assignment',
        instructions: 'Test only.',
        publishedAt: new Date(),
        dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        maxPoints: 100,
      },
    });
    assignmentId = assignment.id;
    const enrollment = await db().enrollment.create({ data: { courseId, userId: student.id } });
    studentEnrollmentId = enrollment.id;
    await db().enrollment.createMany({
      data: [
        { courseId, userId: allowed.id, status: 'Active' },
        { courseId, userId: alsoAllowed.id, status: 'Active' },
        { courseId, userId: denied.id, status: 'Active' },
        { courseId, userId: suspended.id, status: 'Suspended' },
      ],
    });
    await db().notificationSubscription.createMany({
      data: [
        { courseId, userId: student.id, status: 'Denied' },
        { courseId, userId: denied.id, status: 'Denied' },
      ],
    });
    const submission = await db().submission.create({
      data: {
        assignmentId,
        userId: student.id,
        textBody: 'Test submission',
        status: 'Graded',
        score: 85,
        feedback: 'Good work.',
        gradedById: instructor.id,
        gradedAt: new Date(),
      },
    });
    submissionId = submission.id;
    server = createWorkerServer({ handle: runtime.handle, health: runtime.health, logger: () => {} });
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    }
    if (runtime) {
      try {
        await db().outboxEvent.deleteMany({ where: { id: { in: outboxIds } } });
        await db().course.deleteMany({ where: { id: { in: courses } } });
        await db().user.deleteMany({ where: { id: { in: users } } });
      } finally {
        await runtime.close();
      }
    }
  });

  it('commits a grade notification despite Denied; the existing API service can read it without changing the outbox', async () => {
    const payload = gradeEvent();
    const outbox = await db().outboxEvent.create({
      data: { id: payload.eventId, type: payload.type, payload: payload.data, publishedAt: new Date(), attempts: 2, lastError: 'unchanged sentinel' },
    });
    outboxIds.push(outbox.id);
    assert.equal(await push(payload), 204);
    const row = await db().notification.findFirstOrThrow({ where: { sourceEventId: payload.eventId } });
    assert.equal(row.recipientId, student.id);
    assert.equal(row.type, 'AssignmentGraded');
    assert.match(row.messageBody, /85\/100/);
    assert.match(row.messageBody, /Good work\./);
    assert.equal(row.actionUrl, `/courses/${courseSlug}/lessons/les_${lessonId}`);
    const auth = { id: student.id, accountType: student.accountType, sessionId: randomUUID() };
    const response = await reader.getOne(auth, row.id);
    assert.equal(response.id, `ntf_${row.id}`);
    assert.equal(response.messageBody, row.messageBody);
    assert.equal('sourceEventId' in response, false);
    assert.ok((await reader.unreadCount(auth)).count >= 1);
    await assert.rejects(reader.getOne({ ...auth, id: allowed.id }, row.id));
    assert.deepEqual(await db().outboxEvent.findUnique({ where: { id: outbox.id } }), outbox);
  });

  it('deduplicates sequential and concurrent deliveries with different Pub/Sub messageIds', async () => {
    const payload = gradeEvent();
    assert.equal(await push(payload), 204);
    assert.equal(await push(payload), 204);
    assert.deepEqual(await Promise.all(Array.from({ length: 4 }, () => push(payload))), [204, 204, 204, 204]);
    assert.deepEqual(await recipients(payload.eventId), [student.id]);
  });

  it('broadcasts only to Active students who have not denied course notifications', async () => {
    const payload = event('ASSIGNMENT_PUBLISHED', { assignmentId: `asg_${assignmentId}`, courseId: `crs_${courseId}` });
    assert.equal(await push(payload), 204);
    assert.equal(await push(payload), 204);
    assert.deepEqual(await recipients(payload.eventId), [allowed.id, alsoAllowed.id].sort());
  });

  it('keeps existing due-soon eligibility rules for enrollment, submission and subscription', async () => {
    for (const user of [allowed, student, denied, suspended]) {
      const payload = event('ASSIGNMENT_DUE_SOON', {
        assignmentId: `asg_${assignmentId}`, courseId: `crs_${courseId}`, userId: user.id,
        dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      });
      assert.equal(await push(payload), 204);
      assert.deepEqual(await recipients(payload.eventId), user.id === allowed.id ? [allowed.id] : []);
    }
  });

  it('reuses course welcome and completion handlers for personal notifications', async () => {
    const payloads = [
      event('ENROLLMENT_CREATED', { enrollmentId: `enr_${studentEnrollmentId}`, courseId: `crs_${courseId}`, userId: student.id, timesEnrolled: 1 }),
      event('COURSE_COMPLETED', { enrollmentId: `enr_${studentEnrollmentId}`, courseId: `crs_${courseId}`, userId: student.id }),
    ];
    for (const payload of payloads) {
      assert.equal(await push(payload), 204);
      assert.deepEqual(await recipients(payload.eventId), [student.id]);
    }
    const rows = await db().notification.findMany({ where: { sourceEventId: { in: payloads.map((payload) => payload.eventId) } } });
    assert.deepEqual(rows.map((row) => row.type).sort(), ['CourseCompleted', 'CourseWelcome']);
  });

  it('reuses account welcome and instructor decision handlers', async () => {
    const payloads = [
      event('USER_REGISTERED', { userId: student.id, requestedInstructor: true }),
      event('INSTRUCTOR_REQUEST_DECIDED', { userId: student.id, decision: 'Approved' }),
    ];
    for (const payload of payloads) {
      assert.equal(await push(payload), 204);
      const row = await db().notification.findFirstOrThrow({ where: { sourceEventId: payload.eventId } });
      assert.equal(row.recipientId, student.id);
      assert.equal(row.type, 'System');
    }
  });

  it('notifies the other side of a submission comment, never its author', async () => {
    for (const author of [instructor, student]) {
      const comment = await db().submissionComment.create({ data: { submissionId, authorId: author.id, body: 'Test comment' } });
      const payload = event('SUBMISSION_COMMENTED', {
        commentId: comment.id, submissionId: `sub_${submissionId}`, assignmentId: `asg_${assignmentId}`,
        courseId: `crs_${courseId}`, authorId: author.id, studentId: student.id,
      });
      assert.equal(await push(payload), 204);
      assert.deepEqual(await recipients(payload.eventId), [author.id === instructor.id ? student.id : instructor.id]);
    }
  });

  it('acknowledges the existing COURSE_PUBLISHED no-op without creating a notification', async () => {
    const payload = event('COURSE_PUBLISHED', { courseId: `crs_${courseId}`, visibility: 'Public' });
    assert.equal(await push(payload), 204);
    assert.deepEqual(await recipients(payload.eventId), []);
  });

  it('does not ACK a failed database write; the same event succeeds on redelivery after recovery', async () => {
    const missingUserId = randomUUID();
    const payload = event('INSTRUCTOR_REQUEST_DECIDED', { userId: missingUserId, decision: 'Approved' });
    assert.equal(await push(payload), 503);
    assert.deepEqual(await recipients(payload.eventId), []);
    await createUser('Student', missingUserId);
    assert.equal(await push(payload), 204);
    assert.equal(await push(payload), 204);
    assert.deepEqual(await recipients(payload.eventId), [missingUserId]);
  });

  it('checks the PostgreSQL connection in health', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    await response.arrayBuffer();
  });
});
