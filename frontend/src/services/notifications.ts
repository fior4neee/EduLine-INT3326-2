import { api } from "./api";
import type { Paginated } from "./auth";

// backend/README.md §3.9 and docs/m2-plan.md §4.

export type NotificationType =
  | "AssignmentGraded"
  | "AssignmentPublished"
  | "AssignmentDueSoon"
  | "SubmissionComment"
  | "CourseCompleted"
  | "CourseWelcome"
  | "CourseAnnouncement"
  | "System";

export interface AppNotification {
  id: string; // "ntf_…"
  type: NotificationType;
  title: string;
  messageBody: string;
  imageUrl: string | null;
  actionUrl: string | null;
  groupKey: string | null;
  isRead: boolean;
  createdAt: string;
}

export type NotificationPermission = "Default" | "Granted" | "Denied";

// Fired after the inbox or bell changes read state, so the bell badge updates at once.
export const NOTIFICATIONS_CHANGED = "eduline:notifications-changed";
export function announceNotificationsChanged(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
}

export async function listNotifications(params: {
  unread?: boolean;
  types?: NotificationType[];
  page?: number;
  pageSize?: number;
}): Promise<Paginated<AppNotification>> {
  const { types, ...rest } = params;
  return (
    await api.get<Paginated<AppNotification>>("/notifications", {
      params: { ...rest, ...(types?.length && { types: types.join(",") }) },
    })
  ).data;
}

export async function getNotification(id: string): Promise<AppNotification> {
  return (await api.get<AppNotification>(`/notifications/${id}`)).data;
}

export async function markUnread(id: string): Promise<AppNotification> {
  return (await api.patch<AppNotification>(`/notifications/${id}/unread`)).data;
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}

export async function getUnreadCount(): Promise<number> {
  return (await api.get<{ count: number }>("/notifications/unread-count")).data.count;
}

export async function markRead(id: string): Promise<AppNotification> {
  return (await api.patch<AppNotification>(`/notifications/${id}/read`)).data;
}

export async function markAllRead(): Promise<number> {
  return (await api.patch<{ updated: number }>("/notifications/read-all")).data.updated;
}

export async function getCourseSubscription(courseId: string): Promise<NotificationPermission> {
  return (await api.get<{ status: NotificationPermission }>(`/courses/${courseId}/subscription`)).data
    .status;
}

export async function setCourseSubscription(
  courseId: string,
  status: NotificationPermission,
): Promise<void> {
  await api.put(`/courses/${courseId}/subscription`, { status });
}

// "Thứ Bảy, 08/11/2026 lúc 17:41"
export function fullDateTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} lúc ${time}`;
}

// Day heading in the inbox list: "Hôm nay", "Hôm qua", or the date.
export function dayGroup(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((start(today) - start(d)) / 86_400_000);
  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return "Tuần này";
  return d.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
}

// "5 phút trước", "2 giờ trước", "3 ngày trước", then the date.
export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "Vừa xong";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}
