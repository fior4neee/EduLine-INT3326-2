import type { Difficulty, EnrollmentStatus, Visibility } from "../services/courses";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  Elementary: "Tiểu học",
  "Middle School": "THCS",
  "High School": "THPT",
  College: "Đại học",
};

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  Public: "Công khai",
  Restricted: "Có mật khẩu",
  Draft: "Bản nháp",
  Archived: "Đã lưu trữ",
};

export const VISIBILITY_BADGE: Record<Visibility, string> = {
  Public: "bg-emerald-50 text-emerald-700",
  Restricted: "bg-amber-50 text-amber-700",
  Draft: "bg-slate-100 text-slate-600",
  Archived: "bg-red-50 text-red-700",
};

export const ENROLLMENT_LABEL: Record<EnrollmentStatus, string> = {
  Active: "Đang học",
  Completed: "Đã hoàn thành",
  Suspended: "Bị đình chỉ",
  Dropped: "Đã hủy",
};

export const ENROLLMENT_BADGE: Record<EnrollmentStatus, string> = {
  Active: "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Suspended: "bg-red-50 text-red-700",
  Dropped: "bg-slate-100 text-slate-600",
};

// 135 → "2 giờ 15 phút"
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} phút`;
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
}

export function instructorNames(course: { instructors: Array<{ firstName: string; lastName: string }> }) {
  return course.instructors.map((i) => `${i.lastName} ${i.firstName}`).join(", ");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN");
}

export const COURSE_PLACEHOLDER_IMAGE = "/images/student-learning.png";
