import {
  Award,
  Bell,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Megaphone,
  MessageSquare,
  PartyPopper,
} from "lucide-react";
import type { NotificationType } from "../services/notifications";

// Default icon per type, used when a notification has no picture.
export const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  AssignmentGraded: ClipboardCheck,
  AssignmentPublished: ClipboardList,
  AssignmentDueSoon: CalendarClock,
  SubmissionComment: MessageSquare,
  CourseCompleted: Award,
  CourseWelcome: PartyPopper,
  CourseAnnouncement: Megaphone,
  System: Bell,
};

export const TYPE_LABEL: Record<NotificationType, string> = {
  AssignmentGraded: "Đã chấm điểm",
  AssignmentPublished: "Bài tập mới",
  AssignmentDueSoon: "Sắp đến hạn",
  SubmissionComment: "Bình luận",
  CourseCompleted: "Hoàn thành khóa học",
  CourseWelcome: "Chào mừng",
  CourseAnnouncement: "Thông báo khóa học",
  System: "Hệ thống",
};

// Label of the "open" button in the inbox.
export const ACTION_LABEL: Record<NotificationType, string> = {
  AssignmentGraded: "Xem bài tập",
  AssignmentPublished: "Xem bài tập",
  AssignmentDueSoon: "Làm bài ngay",
  SubmissionComment: "Xem bình luận",
  CourseCompleted: "Đi đến khóa học",
  CourseWelcome: "Đi đến khóa học",
  CourseAnnouncement: "Đi đến khóa học",
  System: "Mở",
};

// Inbox tabs. `types` undefined = every type.
export const INBOX_TABS: Array<{ key: string; label: string; unread?: boolean; types?: NotificationType[] }> = [
  { key: "all", label: "Tất cả" },
  { key: "unread", label: "Chưa đọc", unread: true },
  {
    key: "assignments",
    label: "Bài tập",
    types: ["AssignmentPublished", "AssignmentDueSoon", "AssignmentGraded", "SubmissionComment"],
  },
  { key: "courses", label: "Khóa học", types: ["CourseWelcome", "CourseCompleted", "CourseAnnouncement"] },
  { key: "system", label: "Hệ thống", types: ["System"] },
];
