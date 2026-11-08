import { api } from "./api";
import type { LessonType } from "./courses";

export interface Lesson {
  id: string; // "les_…"
  moduleId: string;
  courseId: string;
  course: { id: string; title: string; slug: string };
  title: string;
  slug: string;
  type: LessonType;
  sortOrder: number;
  estimatedDurationMinutes: number | null;
  isPreview: boolean;
  textContent: string | null;
  videoUrl: string | null;
  isSampleVideo: boolean;
  downloadableResources: string[];
  // For Assignment / Quiz lessons.
  assignmentId: string | null;
  quizId: string | null;
}

// M3's progress API (backend README §8, docs/m3-plan.md §4.3).
export interface LessonProgress {
  lessonId: string;
  lastPositionSeconds: number;
  percent: number;
  completedAt: string | null;
}

export interface CourseProgress {
  courseId: string;
  progressPercentage: number;
  completedLessonIds: string[];
  resumeLessonId: string | null;
}

export async function getLesson(lessonId: string): Promise<Lesson> {
  return (await api.get<Lesson>(`/lessons/${lessonId}`)).data;
}

export async function getLessonProgress(lessonId: string): Promise<LessonProgress> {
  return (await api.get<LessonProgress>(`/lessons/${lessonId}/progress`)).data;
}

export async function getCourseProgress(courseId: string): Promise<CourseProgress> {
  return (await api.get<CourseProgress>(`/courses/${courseId}/progress/me`)).data;
}

// Video player heartbeat (about every 15 s while playing, and on pause / end).
export async function sendVideoProgress(
  lessonId: string,
  positionSeconds: number,
  durationSeconds: number,
): Promise<LessonProgress> {
  return (
    await api.put<LessonProgress>(`/lessons/${lessonId}/progress`, {
      positionSeconds,
      durationSeconds,
    })
  ).data;
}

// "Mark as complete" for Text and Document lessons.
export async function completeLesson(lessonId: string): Promise<LessonProgress> {
  return (await api.post<LessonProgress>(`/lessons/${lessonId}/complete`)).data;
}
