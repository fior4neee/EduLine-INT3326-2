import { api } from "./api";

export type EnrollmentStatus = "Active" | "Completed" | "Suspended" | "Dropped";
export interface Course {
  id: string;
  title: string;
  slug: string;
  shortSummary: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  difficultyLevel: string;
  instructors: Array<{ firstName: string; lastName: string }>;
  stats: { lessonCount: number; totalDurationMinutes: number; studentCount: number };
}
export interface CourseDetail extends Course {
  requiresPassword: boolean;
  visibility: string;
  modules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string; type: string; estimatedDurationMinutes: number | null }> }>;
  viewer: { enrollment: { id: string; status: EnrollmentStatus } | null };
}
export interface MyCourse {
  enrollment: { id: string; status: EnrollmentStatus; enrolledAt: string; completedAt: string | null };
  course: Course;
  progressPercentage: number;
}
export interface Paginated<T> { data: T[]; meta: { page: number; pageSize: number; total: number } }

export async function listMyCourses(): Promise<Paginated<MyCourse>> {
  return (await api.get<Paginated<MyCourse>>("/me/courses", { params: { page: 1, pageSize: 50 } })).data;
}
export async function listCatalog(query: { q?: string; page?: number; pageSize?: number } = {}): Promise<Paginated<Course>> {
  return (await api.get<Paginated<Course>>("/courses", { params: { page: 1, pageSize: 8, sort: "newest", ...query } })).data;
}
export async function getCourse(idOrSlug: string): Promise<CourseDetail> {
  return (await api.get<CourseDetail>(`/courses/${encodeURIComponent(idOrSlug)}`)).data;
}
export async function enrollInCourse(courseId: string, coursePassword?: string) {
  return (await api.post(`/courses/${encodeURIComponent(courseId)}/enroll`, { coursePassword })).data;
}
