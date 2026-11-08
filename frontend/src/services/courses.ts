import { api } from "./api";
import type { Paginated } from "./auth";

// Shapes from backend/README.md §3.2–3.5 and §8.

export type Difficulty = "Elementary" | "Middle School" | "High School" | "College";
export type Visibility = "Public" | "Restricted" | "Draft" | "Archived";
export type EnrollmentStatus = "Active" | "Completed" | "Suspended" | "Dropped";
export type LessonType = "Video" | "Text" | "Document" | "Quiz" | "Assignment";

export interface Course {
  id: string; // "crs_1234"
  title: string;
  slug: string;
  shortSummary: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  welcomeMessage: string | null;
  difficultyLevel: Difficulty;
  instructorIds: string[];
  instructors: Array<{ id: string; firstName: string; lastName: string }>;
  visibility: Visibility;
  requiresPassword: boolean;
  enrollmentOpensAt: string | null;
  enrollmentClosesAt: string | null;
  hasCertificate: boolean;
  prerequisiteCourseIds: string[];
  stats: { lessonCount: number; totalDurationMinutes: number; studentCount: number };
  createdAt: string;
  updatedAt: string;
}

export interface OutlineLesson {
  id: string;
  title: string;
  slug: string;
  type: LessonType;
  sortOrder: number;
  estimatedDurationMinutes: number | null;
  isPreview: boolean;
}

export interface OutlineModule {
  id: string;
  title: string;
  sortOrder: number;
  lessons: OutlineLesson[];
}

export interface CourseDetail extends Course {
  modules: OutlineModule[];
  prerequisites: Array<{ id: string; title: string; slug: string }>;
  viewer: {
    isStaff: boolean;
    enrollment: {
      id: string;
      status: EnrollmentStatus;
      timesEnrolled: number;
      completedAt: string | null;
    } | null;
  };
}

export interface Enrollment {
  id: string; // "enr_…"
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  timesEnrolled: number;
  completedAt: string | null;
  enrolledAt: string;
}

export interface CatalogQuery {
  q?: string;
  difficultyLevel?: Difficulty;
  sort?: "newest" | "title";
  page?: number;
  pageSize?: number;
}

// ─── Students and visitors ─────────────────────────────────────────────────

export async function listCatalog(query: CatalogQuery = {}): Promise<Paginated<Course>> {
  return (await api.get<Paginated<Course>>("/courses", { params: query })).data;
}

export async function getCourse(idOrSlug: string): Promise<CourseDetail> {
  return (await api.get<CourseDetail>(`/courses/${encodeURIComponent(idOrSlug)}`)).data;
}

// `notifications` is the answer to "receive notifications from this course?".
export async function enroll(
  courseId: string,
  coursePassword?: string,
  notifications?: "Granted" | "Denied",
): Promise<Enrollment> {
  return (await api.post<Enrollment>(`/courses/${courseId}/enroll`, { coursePassword, notifications })).data;
}

export async function dropCourse(courseId: string): Promise<void> {
  await api.delete(`/courses/${courseId}/enroll`);
}

export interface MyCourse {
  enrollment: Enrollment;
  course: Course;
  progressPercentage: number;
}

export async function listMyCourses(page = 1): Promise<Paginated<MyCourse>> {
  return (await api.get<Paginated<MyCourse>>("/me/courses", { params: { page, pageSize: 50 } }))
    .data;
}

// ─── Instructors ───────────────────────────────────────────────────────────

export async function listTeachingCourses(): Promise<Paginated<Course>> {
  return (await api.get<Paginated<Course>>("/instructor/courses", { params: { pageSize: 100 } }))
    .data;
}

export interface CourseInput {
  title: string;
  shortSummary?: string | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  welcomeMessage?: string | null;
  difficultyLevel: Difficulty;
  hasCertificate?: boolean;
  coursePassword?: string | null;
  enrollmentOpensAt?: string | null;
  enrollmentClosesAt?: string | null;
}

export async function createCourse(input: CourseInput): Promise<Course> {
  return (await api.post<Course>("/courses", input)).data;
}

export async function updateCourse(id: string, input: Partial<CourseInput>): Promise<Course> {
  return (await api.patch<Course>(`/courses/${id}`, input)).data;
}

export async function publishCourse(id: string, visibility: "Public" | "Restricted"): Promise<Course> {
  return (await api.post<Course>(`/courses/${id}/publish`, { visibility })).data;
}

export async function archiveCourse(id: string): Promise<Course> {
  return (await api.delete<Course>(`/courses/${id}`)).data;
}

export async function createModule(courseId: string, title: string) {
  return (await api.post(`/courses/${courseId}/modules`, { title })).data;
}

export async function deleteModule(moduleId: string): Promise<void> {
  await api.delete(`/modules/${moduleId}`);
}

export interface LessonInput {
  title: string;
  type: "Text" | "Video" | "Document";
  estimatedDurationMinutes?: number;
  isPreview?: boolean;
  textContent?: string;
}

export async function createLesson(moduleId: string, input: LessonInput) {
  return (await api.post(`/modules/${moduleId}/lessons`, input)).data;
}

export async function deleteLesson(lessonId: string): Promise<void> {
  await api.delete(`/lessons/${lessonId}`);
}

export interface CourseStudent {
  enrollment: Enrollment;
  student: { id: string; username: string; firstName: string; lastName: string; email: string };
}

export async function listStudents(courseId: string): Promise<Paginated<CourseStudent>> {
  return (
    await api.get<Paginated<CourseStudent>>(`/courses/${courseId}/students`, {
      params: { pageSize: 100 },
    })
  ).data;
}

export async function setEnrollmentStatus(
  enrollmentId: string,
  status: "Suspended" | "Active",
): Promise<Enrollment> {
  return (await api.patch<Enrollment>(`/enrollments/${enrollmentId}`, { status })).data;
}
