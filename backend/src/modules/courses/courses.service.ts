import { HttpStatus, Injectable } from '@nestjs/common';
import { Course, Prisma } from '@prisma/client';
import type { AuthUser } from '../../common/auth/auth-user';
import { PrismaService, Tx } from '../../common/database/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import { parsePublicId, toPublicId } from '../../common/ids/public-id';
import {
  paginated,
  Paginated,
  PaginationQueryDto,
  skipTake,
} from '../../common/pagination/pagination';
import { hashSecret } from '../../common/security/hashing';
import { OutboxService } from '../../events/outbox.service';
import { AccessPolicyService, isPublished } from '../access/access-policy.service';
import { UsersService } from '../users/users.service';
import {
  courseInclude,
  CourseResponse,
  CourseStats,
  CourseWithLinks,
  difficultyFromApi,
  EMPTY_STATS,
  outlineInclude,
  toCourseResponse,
  toOutline,
} from './course.mapper';
import { CatalogQueryDto, CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { SLUG_REGEX, slugify } from './slug';

const courseNotFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'COURSE_NOT_FOUND', 'Course not found.');

const unprocessable = (code: string, message: string, details: unknown[] = []) =>
  new AppException(HttpStatus.UNPROCESSABLE_ENTITY, code, message, details);

// Owns courses, course_instructors and course_prerequisites.
@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessPolicyService,
    private readonly users: UsersService,
    private readonly outbox: OutboxService,
  ) {}

  // ─── Lookups used by other modules ────────────────────────────────────────

  findById(id: number): Promise<Course | null> {
    return this.prisma.course.findUnique({ where: { id } });
  }

  findManyWithLinks(ids: number[]): Promise<CourseWithLinks[]> {
    return this.prisma.course.findMany({ where: { id: { in: ids } }, include: courseInclude });
  }

  // Course objects with lesson count, total duration and student count.
  // Two grouped queries for the whole page, not one per course.
  async present(courses: CourseWithLinks[]): Promise<CourseResponse[]> {
    const stats = await this.loadStats(courses.map((c) => c.id));
    return courses.map((c) => toCourseResponse(c, stats.get(c.id)));
  }

  async presentOne(course: CourseWithLinks): Promise<CourseResponse> {
    return (await this.present([course]))[0];
  }

  private async loadStats(ids: number[]): Promise<Map<number, CourseStats>> {
    const result = new Map<number, CourseStats>(ids.map((id) => [id, { ...EMPTY_STATS }]));
    if (ids.length === 0) return result;
    const [lessons, students] = await Promise.all([
      this.prisma.lesson.groupBy({
        by: ['courseId'],
        where: { courseId: { in: ids } },
        _count: { _all: true },
        _sum: { estimatedDurationMinutes: true },
      }),
      this.prisma.enrollment.groupBy({
        by: ['courseId'],
        where: { courseId: { in: ids }, status: { in: ['Active', 'Completed'] } },
        _count: { _all: true },
      }),
    ]);
    for (const l of lessons) {
      const s = result.get(l.courseId)!;
      s.lessonCount = l._count._all;
      s.totalDurationMinutes = l._sum.estimatedDurationMinutes ?? 0;
    }
    for (const e of students) result.get(e.courseId)!.studentCount = e._count._all;
    return result;
  }

  // The course if the caller may manage it. 404 when the caller may not even
  // know it exists, 403 when it is visible but not theirs.
  async getManageable(user: AuthUser, id: number): Promise<Course> {
    const course = await this.findById(id);
    if (!course) throw courseNotFound();
    if (await this.access.isCourseStaff(user, id)) return course;
    if (await this.access.canSeeCourse(user, course)) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'COURSE_STAFF_ONLY',
        'Only instructors of this course or an Admin can do this.',
      );
    }
    throw courseNotFound();
  }

  // ─── Reading ──────────────────────────────────────────────────────────────

  // Public catalog: Public and Restricted courses only.
  async listCatalog(query: CatalogQueryDto): Promise<Paginated<CourseWithLinks>> {
    const where: Prisma.CourseWhereInput = {
      visibility: { in: ['Public', 'Restricted'] },
      ...(query.difficultyLevel && { difficultyLevel: difficultyFromApi(query.difficultyLevel) }),
      ...(query.q && {
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { shortSummary: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };
    const orderBy: Prisma.CourseOrderByWithRelationInput =
      query.sort === 'title' ? { title: 'asc' } : { createdAt: 'desc' };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({ where, orderBy, include: courseInclude, ...skipTake(query) }),
      this.prisma.course.count({ where }),
    ]);
    return paginated(rows, total, query);
  }

  // Course detail and outline, by "crs_1234", "1234" or slug.
  async getDetail(user: AuthUser | undefined, idOrSlug: string) {
    const id = parsePublicId('course', idOrSlug);
    if (id === null && !SLUG_REGEX.test(idOrSlug)) throw courseNotFound();

    const course = await this.prisma.course.findUnique({
      where: id !== null ? { id } : { slug: idOrSlug },
      include: { ...courseInclude, ...outlineInclude },
    });
    if (!course || !(await this.access.canSeeCourse(user, course))) throw courseNotFound();

    const [presented, prerequisites, isStaff, enrollment] = await Promise.all([
      this.presentOne(course),
      this.prisma.course.findMany({
        where: { id: { in: course.prerequisites.map((p) => p.prerequisiteCourseId) } },
        select: { id: true, title: true, slug: true },
      }),
      this.access.isCourseStaff(user, course.id),
      this.access.getEnrollment(user, course.id),
    ]);

    return {
      ...presented,
      modules: toOutline(course.modules),
      prerequisites: prerequisites.map((p) => ({ ...p, id: toPublicId('course', p.id) })),
      // What the caller can do here, so the page can show the right button.
      viewer: {
        isStaff,
        enrollment: enrollment && {
          id: toPublicId('enrollment', enrollment.id),
          status: enrollment.status,
          timesEnrolled: enrollment.timesEnrolled,
          completedAt: enrollment.completedAt,
        },
      },
    };
  }

  // Courses the caller teaches, in every visibility.
  async listForInstructor(
    user: AuthUser,
    query: PaginationQueryDto,
  ): Promise<Paginated<CourseWithLinks>> {
    const where: Prisma.CourseWhereInput = { instructors: { some: { instructorId: user.id } } };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: courseInclude,
        ...skipTake(query),
      }),
      this.prisma.course.count({ where }),
    ]);
    return paginated(rows, total, query);
  }

  // ─── Writing ──────────────────────────────────────────────────────────────

  // New courses start as Draft. The creator is listed as an instructor.
  async create(user: AuthUser, dto: CreateCourseDto): Promise<CourseWithLinks> {
    assertWindow(dto.enrollmentOpensAt ?? null, dto.enrollmentClosesAt ?? null);
    const passwordHash = dto.coursePassword ? await hashSecret(dto.coursePassword) : null;

    return this.prisma.$transaction(async (tx) => {
      const prerequisiteIds = unique(dto.prerequisiteCourseIds ?? []);
      await assertCoursesExist(tx, prerequisiteIds);

      const course = await tx.course.create({
        data: {
          title: dto.title,
          slug: await this.resolveSlug(tx, dto.slug, dto.title),
          shortSummary: dto.shortSummary ?? null,
          category: dto.category ?? null,
          thumbnailUrl: dto.thumbnailUrl ?? null,
          difficultyLevel: difficultyFromApi(dto.difficultyLevel),
          visibility: 'Draft',
          accessPasswordHash: passwordHash,
          enrollmentOpensAt: dto.enrollmentOpensAt ?? null,
          enrollmentClosesAt: dto.enrollmentClosesAt ?? null,
          hasCertificate: dto.hasCertificate ?? false,
          instructors: { create: { instructorId: user.id } },
          prerequisites: {
            create: prerequisiteIds.map((prerequisiteCourseId) => ({ prerequisiteCourseId })),
          },
        },
        include: courseInclude,
      });
      return course;
    });
  }

  async update(user: AuthUser, id: number, dto: UpdateCourseDto): Promise<CourseWithLinks> {
    const course = await this.getManageable(user, id);

    const opensAt =
      dto.enrollmentOpensAt !== undefined ? dto.enrollmentOpensAt : course.enrollmentOpensAt;
    const closesAt =
      dto.enrollmentClosesAt !== undefined ? dto.enrollmentClosesAt : course.enrollmentClosesAt;
    assertWindow(opensAt, closesAt);

    if (dto.coursePassword === null && course.visibility === 'Restricted') {
      throw unprocessable(
        'COURSE_PASSWORD_REQUIRED',
        'A Restricted course needs a password. Publish it as Public first, then remove the password.',
      );
    }
    const passwordHash =
      dto.coursePassword === undefined
        ? undefined
        : dto.coursePassword === null
          ? null
          : await hashSecret(dto.coursePassword);

    return this.prisma.$transaction(async (tx) => {
      if (dto.slug !== undefined && dto.slug !== course.slug) {
        await assertSlugFree(tx, dto.slug);
      }
      if (dto.prerequisiteCourseIds !== undefined) {
        const ids = unique(dto.prerequisiteCourseIds);
        await assertCoursesExist(tx, ids);
        await assertNoPrerequisiteCycle(tx, id, ids);
        await tx.coursePrerequisite.deleteMany({ where: { courseId: id } });
        await tx.coursePrerequisite.createMany({
          data: ids.map((prerequisiteCourseId) => ({ courseId: id, prerequisiteCourseId })),
        });
      }
      return tx.course.update({
        where: { id },
        data: {
          title: dto.title,
          slug: dto.slug,
          shortSummary: dto.shortSummary,
          category: dto.category,
          thumbnailUrl: dto.thumbnailUrl,
          difficultyLevel: dto.difficultyLevel && difficultyFromApi(dto.difficultyLevel),
          enrollmentOpensAt: dto.enrollmentOpensAt,
          enrollmentClosesAt: dto.enrollmentClosesAt,
          hasCertificate: dto.hasCertificate,
          accessPasswordHash: passwordHash,
        },
        include: courseInclude,
      });
    });
  }

  // Draft/Archived → Public/Restricted, or switch between the two.
  // Needs at least one lesson; Restricted also needs a course password.
  async publish(
    user: AuthUser,
    id: number,
    visibility: 'Public' | 'Restricted',
  ): Promise<CourseWithLinks> {
    const course = await this.getManageable(user, id);

    if ((await this.prisma.lesson.count({ where: { courseId: id } })) === 0) {
      throw unprocessable(
        'COURSE_HAS_NO_LESSONS',
        'Add at least one module with one lesson before publishing.',
      );
    }
    if (visibility === 'Restricted' && !course.accessPasswordHash) {
      throw unprocessable(
        'COURSE_PASSWORD_REQUIRED',
        'Set a course password before publishing as Restricted.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.course.update({
        where: { id },
        data: { visibility },
        include: courseInclude,
      });
      if (!isPublished(course.visibility)) {
        await this.outbox.add(tx, 'COURSE_PUBLISHED', {
          courseId: toPublicId('course', id),
          visibility,
        });
      }
      return updated;
    });
  }

  // Soft delete. Enrolled students keep read-only access and their results.
  async archive(user: AuthUser, id: number): Promise<CourseWithLinks> {
    await this.getManageable(user, id);
    return this.prisma.course.update({
      where: { id },
      data: { visibility: 'Archived' },
      include: courseInclude,
    });
  }

  async addInstructor(user: AuthUser, courseId: number, userId: string): Promise<CourseWithLinks> {
    await this.getManageable(user, courseId);
    const target = await this.users.getById(userId);
    if (target.accountType === 'Student') {
      throw unprocessable(
        'USER_NOT_INSTRUCTOR',
        'Only Instructor or Admin accounts can teach a course.',
      );
    }
    await this.prisma.courseInstructor.createMany({
      data: [{ courseId, instructorId: userId }],
      skipDuplicates: true,
    });
    return this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      include: courseInclude,
    });
  }

  async removeInstructor(
    user: AuthUser,
    courseId: number,
    userId: string,
  ): Promise<CourseWithLinks> {
    await this.getManageable(user, courseId);
    return this.prisma.$transaction(async (tx) => {
      const instructors = await tx.courseInstructor.findMany({
        where: { courseId },
        select: { instructorId: true },
      });
      if (!instructors.some((i) => i.instructorId === userId)) {
        throw new AppException(
          HttpStatus.NOT_FOUND,
          'INSTRUCTOR_NOT_ON_COURSE',
          'This user is not an instructor of the course.',
        );
      }
      if (instructors.length === 1) {
        throw unprocessable('LAST_INSTRUCTOR', 'A course must keep at least one instructor.');
      }
      await tx.courseInstructor.delete({
        where: { courseId_instructorId: { courseId, instructorId: userId } },
      });
      return tx.course.findUniqueOrThrow({ where: { id: courseId }, include: courseInclude });
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async resolveSlug(tx: Tx, requested: string | undefined, title: string): Promise<string> {
    if (requested) {
      await assertSlugFree(tx, requested);
      return requested;
    }
    const base = slugify(title);
    const taken = new Set(
      (
        await tx.course.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })
      ).map((c) => c.slug),
    );
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) {
      const candidate = `${base}-${n}`;
      if (!taken.has(candidate)) return candidate;
    }
  }
}

function unique(ids: number[]): number[] {
  return [...new Set(ids)];
}

function assertWindow(opensAt: Date | null, closesAt: Date | null): void {
  if (opensAt && closesAt && opensAt >= closesAt) {
    throw unprocessable(
      'INVALID_ENROLLMENT_WINDOW',
      'enrollmentOpensAt must be before enrollmentClosesAt.',
    );
  }
}

async function assertSlugFree(tx: Tx, slug: string): Promise<void> {
  if (await tx.course.findUnique({ where: { slug }, select: { id: true } })) {
    throw new AppException(
      HttpStatus.CONFLICT,
      'SLUG_TAKEN',
      'Another course already uses this slug.',
    );
  }
}

async function assertCoursesExist(tx: Tx, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const found = await tx.course.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (found.length !== ids.length) {
    const existing = new Set(found.map((c) => c.id));
    throw unprocessable('PREREQUISITE_NOT_FOUND', 'A prerequisite course does not exist.', [
      {
        missingCourseIds: ids
          .filter((id) => !existing.has(id))
          .map((id) => toPublicId('course', id)),
      },
    ]);
  }
}

// Rejects "course requires itself" and loops such as 1 → 2 → 1. Walks the
// prerequisite graph from the new prerequisites; reaching the course is a loop.
async function assertNoPrerequisiteCycle(tx: Tx, courseId: number, prerequisiteIds: number[]) {
  if (prerequisiteIds.includes(courseId)) {
    throw unprocessable('PREREQUISITE_SELF', 'A course cannot be its own prerequisite.');
  }
  const seen = new Set<number>(prerequisiteIds);
  let frontier = prerequisiteIds;
  while (frontier.length > 0) {
    const rows = await tx.coursePrerequisite.findMany({
      where: { courseId: { in: frontier } },
      select: { prerequisiteCourseId: true },
    });
    frontier = [];
    for (const { prerequisiteCourseId: next } of rows) {
      if (next === courseId) {
        throw unprocessable('PREREQUISITE_CYCLE', 'These prerequisites would create a loop.');
      }
      if (!seen.has(next)) {
        seen.add(next);
        frontier.push(next);
      }
    }
  }
}
