import type { Notification } from '@prisma/client';
import { toPublicId } from '../../common/ids/public-id';

// Notification object (backend README §3.9). sourceEventId is never sent.
export function toNotificationResponse(n: Notification) {
  return {
    id: toPublicId('notification', n.id),
    type: n.type,
    title: n.title,
    messageBody: n.messageBody,
    imageUrl: n.imageUrl,
    actionUrl: n.actionUrl,
    groupKey: n.groupKey,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}
