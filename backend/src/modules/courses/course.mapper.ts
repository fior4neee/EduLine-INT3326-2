import { DifficultyLevel, Prisma } from '@prisma/client';
import { toPublicId } from '../../common/ids/public-id';

// The API uses the labels from backend README §3.2 ("Middle School");
// Prisma's enum keys cannot contain spaces ("MiddleSchool").
export const DIFFICULTY_TO_API = {
  Elementary: 'Elementary',
  MiddleSchool: 'Middle School',
  HighSchool: 'High School',
  College: 'College',
} as const satisfies Record<DifficultyLevel, string>;

export type DifficultyApi = (typeof DIFFICULTY_TO_API)[DifficultyLevel];
export const DIFFICULTY_API_VALUES = Object.values(DIFFICULTY_TO_API) as DifficultyApi[];

export function difficultyFromApi(value: DifficultyApi): DifficultyLevel {
  const entry = Object.entries(DIFFICULTY_TO_API).find(([, label]) => label === value);
  return entry![0] as DifficultyLevel;
}

export const courseInclude = {
  // Instructor names are read through the relation for display on course cards.
  instructors: {
    select: {
      instructorId: true,
      instructor: { select: { firstName: true, lastName: true } },
    },
  },
  prerequisites: { select: { prerequisiteCourseId: true } },
} satisfies Prisma.CourseInclude;

export type CourseWithLinks = Prisma.CourseGetPayload<{ include: typeof courseInclude }>;

// Computed per request, never stored.
export interface CourseStats {
  lessonCount: number;
  totalDurationMinutes: number;
  // Active + Completed enrollments.
  studentCount: number;
}

export const EMPTY_STATS: CourseStats = { lessonCount: 0, totalDurationMinutes: 0, studentCount: 0 };

// Course object (backend README §3.2). Never includes accessPasswordHash.
export function toCourseResponse(c: CourseWithLinks, stats: CourseStats = EMPTY_STATS) {
  return {
    id: toPublicId('course', c.id),
    title: c.title,
    slug: c.slug,
    shortSummary: c.shortSummary,
    category: c.category,
    thumbnailUrl: c.thumbnailUrl,
    welcomeMessage: c.welcomeMessage,
    difficultyLevel: DIFFICULTY_TO_API[c.difficultyLevel],
    instructorIds: c.instructors.map((i) => i.instructorId),
    instructors: c.instructors.map((i) => ({
      id: i.instructorId,
      firstName: i.instructor.firstName,
      lastName: i.instructor.lastName,
    })),
    visibility: c.visibility,
    requiresPassword: c.visibility === 'Restricted',
    enrollmentOpensAt: c.enrollmentOpensAt,
    enrollmentClosesAt: c.enrollmentClosesAt,
    hasCertificate: c.hasCertificate,
    prerequisiteCourseIds: c.prerequisites.map((p) => toPublicId('course', p.prerequisiteCourseId)),
    stats,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export type CourseResponse = ReturnType<typeof toCourseResponse>;

// Course outline for the detail page: titles and order only, no media URLs.
export const outlineInclude = {
  modules: {
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      title: true,
      sortOrder: true,
      lessons: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          sortOrder: true,
          estimatedDurationMinutes: true,
          isPreview: true,
        },
      },
    },
  },
} satisfies Prisma.CourseInclude;

type OutlineModules = Prisma.CourseGetPayload<{ include: typeof outlineInclude }>['modules'];

export function toOutline(modules: OutlineModules) {
  return modules.map((m) => ({
    id: toPublicId('module', m.id),
    title: m.title,
    sortOrder: m.sortOrder,
    lessons: m.lessons.map((l) => ({
      id: toPublicId('lesson', l.id),
      title: l.title,
      slug: l.slug,
      type: l.type,
      sortOrder: l.sortOrder,
      estimatedDurationMinutes: l.estimatedDurationMinutes,
      isPreview: l.isPreview,
    })),
  }));
}
