import { Injectable, Logger } from '@nestjs/common';
import type { Tx } from '../../common/database/prisma.service';
import { EntityKind, parsePublicId, toPublicId } from '../../common/ids/public-id';
import type { EventPayloads, EventType } from '../../events/event-types';
import { NotificationsService } from './notifications.service';

export interface OutboxEnvelope<T extends EventType = EventType> {
  eventId: string;
  type: T;
  occurredAt: Date;
  data: EventPayloads[T];
}

// Thrown for a malformed event. The processor records it and retries a few times,
// then skips the event so it cannot block the queue.
class BadEventError extends Error {}

function idOf(kind: EntityKind, publicId: string): number {
  const id = parsePublicId(kind, publicId);
  if (id === null) throw new BadEventError(`Bad ${kind} id in event: ${publicId}`);
  return id;
}
const courseIdOf = (publicId: string) => idOf('course', publicId);

// Dates in notifications are shown in Vietnam time, e.g. "29/09/2026, 10:00".
const VN_DATE = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const formatDate = (d: Date) => VN_DATE.format(d);

const snippet = (text: string, max = 160) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

// Welcome picture for new accounts (frontend public/images).
const WELCOME_IMAGE = '/images/student-learning.png';

// Turns outbox events into notifications (docs/m2-plan.md §5). Runs inside the
// processor's transaction, so the notifications and "event handled" commit
// together. Every handler is safe to run twice for the same event.
@Injectable()
export class NotificationFanoutService {
  private readonly logger = new Logger('NotificationFanout');

  constructor(private readonly notifications: NotificationsService) {}

  // Returns how many notifications were created.
  async handle(event: OutboxEnvelope, tx: Tx): Promise<number> {
    switch (event.type) {
      case 'ENROLLMENT_CREATED':
        return this.onEnrollmentCreated(event as OutboxEnvelope<'ENROLLMENT_CREATED'>, tx);
      case 'COURSE_COMPLETED':
        return this.onCourseCompleted(event as OutboxEnvelope<'COURSE_COMPLETED'>, tx);
      case 'INSTRUCTOR_REQUEST_DECIDED':
        return this.onInstructorDecision(event as OutboxEnvelope<'INSTRUCTOR_REQUEST_DECIDED'>, tx);
      case 'USER_REGISTERED':
        return this.onUserRegistered(event as OutboxEnvelope<'USER_REGISTERED'>, tx);
      case 'ASSIGNMENT_PUBLISHED':
        return this.onAssignmentPublished(event as OutboxEnvelope<'ASSIGNMENT_PUBLISHED'>, tx);
      case 'ASSIGNMENT_DUE_SOON':
        return this.onAssignmentDueSoon(event as OutboxEnvelope<'ASSIGNMENT_DUE_SOON'>, tx);
      case 'ASSIGNMENT_GRADED':
        return this.onAssignmentGraded(event as OutboxEnvelope<'ASSIGNMENT_GRADED'>, tx);
      case 'SUBMISSION_COMMENTED':
        return this.onSubmissionCommented(event as OutboxEnvelope<'SUBMISSION_COMMENTED'>, tx);
      case 'COURSE_PUBLISHED':
        return 0; // nobody is enrolled in a course that was just published
      case 'EMAIL_REQUESTED':
        // Email sending is not built yet (M6). Nothing to notify in the app.
        this.logger.warn(`Email not sent (no email sender configured): ${event.eventId}`);
        return 0;
      default:
        this.logger.warn(`No handler for event type ${String(event.type)}`);
        return 0;
    }
  }

  // Personal: the first notification of every new account.
  private async onUserRegistered(e: OutboxEnvelope<'USER_REGISTERED'>, tx: Tx) {
    const user = await tx.user.findUnique({
      where: { id: e.data.userId },
      select: { firstName: true },
    });
    if (!user) return 0;
    const instructorNote = e.data.requestedInstructor
      ? ' Yêu cầu trở thành giảng viên của bạn đang chờ Admin duyệt; trong lúc chờ bạn dùng được mọi chức năng của học viên.'
      : '';
    return this.notifications.deliver(tx, e.eventId, [e.data.userId], {
      type: 'System',
      title: `Chào mừng ${user.firstName} đến với EduLine!`,
      messageBody: `Cảm ơn bạn đã đăng ký. Khám phá các khóa học và bắt đầu học ngay hôm nay.${instructorNote}`,
      imageUrl: WELCOME_IMAGE,
      actionUrl: '/courses',
    });
  }

  // Broadcast: Active students of the course, minus those who chose "Denied".
  private async onAssignmentPublished(e: OutboxEnvelope<'ASSIGNMENT_PUBLISHED'>, tx: Tx) {
    const a = await this.loadAssignment(tx, idOf('assignment', e.data.assignmentId));
    if (!a?.publishedAt) return 0; // deleted since
    const audience = await this.notifications.broadcastAudience(tx, a.courseId);
    return this.notifications.deliver(tx, e.eventId, audience, {
      type: 'AssignmentPublished',
      title: `Bài tập mới: ${a.title}`,
      messageBody: `${a.course.title} · ${a.dueAt ? `Hạn nộp: ${formatDate(a.dueAt)}` : 'Không có hạn nộp'}`,
      imageUrl: a.course.thumbnailUrl,
      actionUrl: lessonUrl(a),
    });
  }

  // Broadcast-type reminder, at most one per student per assignment. Skipped if
  // the student chose "Denied", has submitted since, is no longer Active, or the
  // due date has been removed or has already passed. Shows the current due date.
  private async onAssignmentDueSoon(e: OutboxEnvelope<'ASSIGNMENT_DUE_SOON'>, tx: Tx) {
    const a = await this.loadAssignment(tx, idOf('assignment', e.data.assignmentId));
    if (!a?.publishedAt || !a.dueAt || a.dueAt <= new Date()) return 0;
    const [enrollment, submitted, subscription] = await Promise.all([
      tx.enrollment.findUnique({
        where: { userId_courseId: { userId: e.data.userId, courseId: a.courseId } },
        select: { status: true },
      }),
      tx.submission.count({ where: { assignmentId: a.id, userId: e.data.userId } }),
      tx.notificationSubscription.findUnique({
        where: { userId_courseId: { userId: e.data.userId, courseId: a.courseId } },
        select: { status: true },
      }),
    ]);
    if (enrollment?.status !== 'Active' || submitted > 0 || subscription?.status === 'Denied') return 0;
    return this.notifications.deliver(tx, e.eventId, [e.data.userId], {
      type: 'AssignmentDueSoon',
      title: `Sắp đến hạn: ${a.title}`,
      messageBody: `Hạn nộp ${formatDate(a.dueAt)} (${a.course.title}). Bạn chưa nộp bài.`,
      imageUrl: a.course.thumbnailUrl,
      actionUrl: lessonUrl(a),
    });
  }

  // Personal: always delivered.
  private async onAssignmentGraded(e: OutboxEnvelope<'ASSIGNMENT_GRADED'>, tx: Tx) {
    const a = await this.loadAssignment(tx, idOf('assignment', e.data.assignmentId));
    if (!a) return 0;
    const submission = await tx.submission.findUnique({
      where: { id: idOf('submission', e.data.submissionId) },
      select: { feedback: true },
    });
    const feedback = submission?.feedback ? ` Nhận xét: "${snippet(submission.feedback, 120)}"` : '';
    return this.notifications.deliver(tx, e.eventId, [e.data.userId], {
      type: 'AssignmentGraded',
      title: `Bài tập đã được chấm: ${a.title}`,
      messageBody: `Điểm của bạn: ${e.data.score}/${e.data.maxPoints}.${feedback}`,
      imageUrl: a.course.thumbnailUrl,
      actionUrl: lessonUrl(a),
    });
  }

  // Personal: the student is told when staff write; the course's instructors are
  // told when the student writes. The author is never notified.
  private async onSubmissionCommented(e: OutboxEnvelope<'SUBMISSION_COMMENTED'>, tx: Tx) {
    const a = await this.loadAssignment(tx, idOf('assignment', e.data.assignmentId));
    const comment = await tx.submissionComment.findUnique({
      where: { id: e.data.commentId },
      select: { body: true, author: { select: { firstName: true, lastName: true } } },
    });
    if (!a || !comment) return 0; // deleted since
    let recipients: string[];
    if (e.data.authorId === e.data.studentId) {
      const staff = await tx.courseInstructor.findMany({
        where: { courseId: a.courseId },
        select: { instructorId: true },
      });
      recipients = staff.map((s) => s.instructorId);
    } else {
      recipients = [e.data.studentId];
    }
    recipients = recipients.filter((id) => id !== e.data.authorId);
    const author = `${comment.author.lastName} ${comment.author.firstName}`;
    return this.notifications.deliver(tx, e.eventId, recipients, {
      type: 'SubmissionComment',
      title: `Bình luận mới: ${a.title}`,
      messageBody: `${author}: ${snippet(comment.body)}`,
      imageUrl: a.course.thumbnailUrl,
      actionUrl: lessonUrl(a),
      groupKey: `${e.data.submissionId}:comments`,
    });
  }

  private loadAssignment(tx: Tx, id: number) {
    return tx.assignment.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        courseId: true,
        lessonId: true,
        dueAt: true,
        publishedAt: true,
        course: { select: { title: true, slug: true, thumbnailUrl: true } },
      },
    });
  }

  // Personal: always delivered, whatever the course subscription says.
  private async onEnrollmentCreated(e: OutboxEnvelope<'ENROLLMENT_CREATED'>, tx: Tx) {
    const course = await tx.course.findUnique({
      where: { id: courseIdOf(e.data.courseId) },
      select: { title: true, slug: true, thumbnailUrl: true, welcomeMessage: true },
    });
    if (!course?.welcomeMessage?.trim()) return 0;
    return this.notifications.deliver(tx, e.eventId, [e.data.userId], {
      type: 'CourseWelcome',
      title: `Chào mừng bạn đến với "${course.title}"`,
      messageBody: course.welcomeMessage.trim(),
      imageUrl: course.thumbnailUrl,
      actionUrl: `/courses/${course.slug}`,
    });
  }

  private async onCourseCompleted(e: OutboxEnvelope<'COURSE_COMPLETED'>, tx: Tx) {
    const course = await tx.course.findUnique({
      where: { id: courseIdOf(e.data.courseId) },
      select: { title: true, slug: true, thumbnailUrl: true, hasCertificate: true },
    });
    if (!course) return 0; // course deleted since
    return this.notifications.deliver(tx, e.eventId, [e.data.userId], {
      type: 'CourseCompleted',
      title: `Chúc mừng! Bạn đã hoàn thành "${course.title}"`,
      messageBody: course.hasCertificate
        ? 'Bạn đã hoàn thành tất cả bài học. Khóa học này có cấp chứng chỉ.'
        : 'Bạn đã hoàn thành tất cả bài học của khóa học.',
      imageUrl: course.thumbnailUrl,
      actionUrl: `/courses/${course.slug}`,
    });
  }

  private async onInstructorDecision(e: OutboxEnvelope<'INSTRUCTOR_REQUEST_DECIDED'>, tx: Tx) {
    const approved = e.data.decision === 'Approved';
    return this.notifications.deliver(tx, e.eventId, [e.data.userId], {
      type: 'System',
      title: approved ? 'Bạn đã trở thành giảng viên' : 'Yêu cầu giảng viên chưa được duyệt',
      messageBody: approved
        ? 'Admin đã duyệt yêu cầu của bạn. Bấm "Kiểm tra lại" ở trang tài khoản (hoặc đăng nhập lại) để dùng các chức năng giảng viên.'
        : 'Admin đã từ chối yêu cầu trở thành giảng viên. Bạn có thể gửi lại yêu cầu ở trang tài khoản.',
      actionUrl: '/account',
    });
  }
}

// The assignment opens on its lesson page.
function lessonUrl(a: { lessonId: number; course: { slug: string } }): string {
  return `/courses/${a.course.slug}/lessons/${toPublicId('lesson', a.lessonId)}`;
}
