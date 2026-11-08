import { HttpStatus, Injectable } from '@nestjs/common';
import { NotificationPermission, NotificationType, Prisma } from '@prisma/client';
import type { AuthUser } from '../../common/auth/auth-user';
import { PrismaService, Tx } from '../../common/database/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import { toPublicId } from '../../common/ids/public-id';
import { paginated, skipTake } from '../../common/pagination/pagination';
import { AccessPolicyService } from '../access/access-policy.service';
import { NotificationsQueryDto } from './dto/notification.dto';
import { toNotificationResponse } from './notification.mapper';

export interface NotificationContent {
  type: NotificationType;
  title: string;
  messageBody: string;
  imageUrl?: string | null;
  actionUrl?: string | null;
  groupKey?: string | null;
}

const MAX_TITLE = 200;
const MAX_BODY = 2000;

const notificationNotFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');

const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

// Owns notifications and notification_subscriptions.
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessPolicyService,
  ) {}

  // ─── Reading (own notifications only) ─────────────────────────────────────

  async list(user: AuthUser, query: NotificationsQueryDto) {
    const where: Prisma.NotificationWhereInput = {
      recipientId: user.id,
      ...(query.unread !== undefined && { isRead: !query.unread }),
      ...(query.types?.length && { type: { in: query.types } }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...skipTake(query),
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginated(rows.map(toNotificationResponse), total, query);
  }

  async unreadCount(user: AuthUser): Promise<{ count: number }> {
    return {
      count: await this.prisma.notification.count({ where: { recipientId: user.id, isRead: false } }),
    };
  }

  // Another user's notification answers 404, as if it did not exist.
  async getOne(user: AuthUser, id: number) {
    const n = await this.prisma.notification.findFirst({ where: { id, recipientId: user.id } });
    if (!n) throw notificationNotFound();
    return toNotificationResponse(n);
  }

  markRead(user: AuthUser, id: number) {
    return this.setRead(user, id, true);
  }

  // Inbox "mark as unread".
  markUnread(user: AuthUser, id: number) {
    return this.setRead(user, id, false);
  }

  async remove(user: AuthUser, id: number): Promise<void> {
    const deleted = await this.prisma.notification.deleteMany({ where: { id, recipientId: user.id } });
    if (deleted.count === 0) throw notificationNotFound();
  }

  private async setRead(user: AuthUser, id: number, isRead: boolean) {
    const updated = await this.prisma.notification.updateMany({
      where: { id, recipientId: user.id },
      data: { isRead },
    });
    if (updated.count === 0) throw notificationNotFound();
    return toNotificationResponse(await this.prisma.notification.findUniqueOrThrow({ where: { id } }));
  }

  async markAllRead(user: AuthUser): Promise<{ updated: number }> {
    const r = await this.prisma.notification.updateMany({
      where: { recipientId: user.id, isRead: false },
      data: { isRead: true },
    });
    return { updated: r.count };
  }

  // ─── Subscriptions ("receive notifications from this course?") ────────────

  async listSubscriptions(user: AuthUser) {
    const rows = await this.prisma.notificationSubscription.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => ({
      courseId: toPublicId('course', r.courseId),
      status: r.status,
      updatedAt: r.updatedAt,
    }));
  }

  async getSubscription(user: AuthUser, courseId: number) {
    await this.assertCanSubscribe(user, courseId);
    const row = await this.prisma.notificationSubscription.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    return { courseId: toPublicId('course', courseId), status: row?.status ?? 'Default' };
  }

  async updateSubscription(user: AuthUser, courseId: number, status: NotificationPermission) {
    await this.assertCanSubscribe(user, courseId);
    await this.setSubscription(this.prisma, user.id, courseId, status);
    return { courseId: toPublicId('course', courseId), status };
  }

  // Also used by EnrollmentsService inside the enroll transaction.
  async setSubscription(db: Tx, userId: string, courseId: number, status: NotificationPermission) {
    await db.notificationSubscription.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, status },
      update: { status },
    });
  }

  // Students with any enrollment in the course (they may come back), or course staff.
  private async assertCanSubscribe(user: AuthUser, courseId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, visibility: true },
    });
    if (!course || !(await this.access.canSeeCourse(user, course))) {
      throw new AppException(HttpStatus.NOT_FOUND, 'COURSE_NOT_FOUND', 'Course not found.');
    }
    if (await this.access.isCourseStaff(user, courseId)) return;
    if ((await this.access.enrollmentStatus(user, courseId)) === null) {
      throw new AppException(HttpStatus.FORBIDDEN, 'NOT_ENROLLED', 'You are not enrolled in this course.');
    }
  }

  // ─── Delivery (used by the fan-out handler) ───────────────────────────────

  // Creates one notification per recipient. Re-delivering the same event is a
  // no-op thanks to the unique (sourceEventId, recipientId).
  async deliver(tx: Tx, eventId: string, recipientIds: string[], content: NotificationContent) {
    const unique = [...new Set(recipientIds)];
    if (unique.length === 0) return 0;
    const created = await tx.notification.createMany({
      data: unique.map((recipientId) => ({
        recipientId,
        sourceEventId: eventId,
        type: content.type,
        title: truncate(content.title, MAX_TITLE),
        messageBody: truncate(content.messageBody, MAX_BODY),
        imageUrl: content.imageUrl ?? null,
        actionUrl: content.actionUrl ?? null,
        groupKey: content.groupKey ?? null,
      })),
      skipDuplicates: true,
    });
    return created.count;
  }

  // Recipients of a course-wide broadcast (new assignment, due soon): Active
  // students, minus those who answered "Denied". Default counts as Granted.
  async broadcastAudience(tx: Tx, courseId: number): Promise<string[]> {
    const rows = await tx.enrollment.findMany({
      where: {
        courseId,
        status: 'Active',
        user: {
          notificationSubscriptions: { none: { courseId, status: 'Denied' } },
        },
      },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }
}
