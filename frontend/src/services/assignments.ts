import { api } from "./api";

// backend/README.md §3.7–3.8.

export type SubmissionType = "TextEntry" | "FileUpload";
export type SubmissionState = "NotSubmitted" | "Missing" | "Submitted" | "Late" | "Graded";

export interface Submission {
  id: string; // "sub_…"
  assignmentId: string;
  userId: string;
  textBody: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  mimeType: string | null;
  status: "Submitted" | "Graded";
  isLate: boolean;
  score: number | null;
  feedback: string | null;
  gradedById: string | null;
  submittedAt: string;
  gradedAt: string | null;
}

export interface Assignment {
  id: string; // "asg_…"
  lessonId: string;
  courseId: string;
  title: string;
  instructions: string | null;
  maxPoints: number;
  submissionTypes: SubmissionType[];
  allowedExtensions: string[];
  unlockAt: string | null;
  dueAt: string | null;
  allowLateSubmissions: boolean;
  attachments: string[];
  publishedAt: string | null;
  isPublished: boolean;
  locked: boolean;
  // Students only:
  submissionState?: SubmissionState;
  mySubmission?: Submission | null;
  submitBlockedReason?: string | null;
}

export interface AssignmentInput {
  title: string;
  instructions: string;
  maxPoints?: number;
  submissionTypes?: SubmissionType[];
  allowedExtensions?: string[];
  unlockAt?: string | null;
  dueAt?: string | null;
  allowLateSubmissions?: boolean;
}

export interface Comment {
  id: number;
  submissionId: string;
  author: { id: string; firstName: string; lastName: string; accountType: string };
  body: string;
  createdAt: string;
}

export interface GradebookRow {
  student: { id: string; username: string; firstName: string; lastName: string; email: string };
  enrollmentStatus: string | null;
  submissionState: SubmissionState;
  submission: Submission | null;
}

export async function getAssignment(id: string): Promise<Assignment> {
  return (await api.get<Assignment>(`/assignments/${id}`)).data;
}

export async function listCourseAssignments(courseId: string): Promise<Assignment[]> {
  return (await api.get<Assignment[]>(`/courses/${courseId}/assignments`)).data;
}

export async function createAssignment(moduleId: string, input: AssignmentInput): Promise<Assignment> {
  return (await api.post<Assignment>(`/modules/${moduleId}/assignments`, input)).data;
}

export async function updateAssignment(id: string, input: Partial<AssignmentInput>): Promise<Assignment> {
  return (await api.patch<Assignment>(`/assignments/${id}`, input)).data;
}

export async function publishAssignment(id: string): Promise<Assignment> {
  return (await api.post<Assignment>(`/assignments/${id}/publish`)).data;
}

export async function deleteAssignment(id: string): Promise<void> {
  await api.delete(`/assignments/${id}`);
}

export async function submitText(id: string, textBody: string): Promise<Submission> {
  return (await api.post<Submission>(`/assignments/${id}/submissions`, { textBody })).data;
}

export async function getGradebook(
  id: string,
): Promise<{ assignment: Assignment; data: GradebookRow[] }> {
  return (await api.get<{ assignment: Assignment; data: GradebookRow[] }>(`/assignments/${id}/submissions`)).data;
}

export async function gradeSubmission(
  submissionId: string,
  score: number,
  feedback: string | null,
): Promise<Submission> {
  return (await api.patch<Submission>(`/submissions/${submissionId}/grade`, { score, feedback })).data;
}

export async function listComments(submissionId: string): Promise<Comment[]> {
  return (await api.get<Comment[]>(`/submissions/${submissionId}/comments`)).data;
}

export async function addComment(submissionId: string, body: string): Promise<Comment> {
  return (await api.post<Comment>(`/submissions/${submissionId}/comments`, { body })).data;
}

export const STATE_LABEL: Record<SubmissionState, string> = {
  NotSubmitted: "Chưa nộp",
  Missing: "Thiếu bài",
  Submitted: "Đã nộp",
  Late: "Nộp muộn",
  Graded: "Đã chấm",
};

export const STATE_BADGE: Record<SubmissionState, string> = {
  NotSubmitted: "bg-slate-100 text-slate-600",
  Missing: "bg-red-50 text-red-700",
  Submitted: "bg-blue-50 text-blue-700",
  Late: "bg-amber-50 text-amber-700",
  Graded: "bg-emerald-50 text-emerald-700",
};

export const TYPE_LABEL: Record<SubmissionType, string> = {
  TextEntry: "ô nhập văn bản",
  FileUpload: "tải tệp lên",
};

export const BLOCK_REASON: Record<string, string> = {
  ENROLLMENT_NOT_ACTIVE: "Chỉ học viên đang học khóa này mới nộp được bài.",
  ALREADY_GRADED: "Bài đã được chấm, không thể nộp lại.",
  ASSIGNMENT_NOT_OPEN: "Bài tập chưa mở.",
  ASSIGNMENT_CLOSED: "Đã hết hạn nộp và giảng viên không nhận bài muộn.",
};

// "29/09/2026 10:00"
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// <input type="datetime-local"> value ↔ ISO string (local time).
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
