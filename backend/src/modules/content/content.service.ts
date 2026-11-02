import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user';
import { PrismaService } from '../../common/database/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import { toPublicId } from '../../common/ids/public-id';
import { CoursesService } from '../courses/courses.service';
import { slugify } from '../courses/slug';
import { CreateLessonDto, CreateModuleDto } from './dto/content.dto';

// Owns modules and lessons. This is the minimal week 3 version: create and
// delete. Editing, reordering and file uploads come in week 4.
@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courses: CoursesService,
  ) {}

  async createModule(user: AuthUser, courseId: number, dto: CreateModuleDto) {
    await this.courses.getManageable(user, courseId);
    const last = await this.prisma.module.findFirst({
      where: { courseId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const m = await this.prisma.module.create({
      data: { courseId, title: dto.title, sortOrder: (last?.sortOrder ?? 0) + 1 },
    });
    return toModuleResponse(m);
  }

  async deleteModule(user: AuthUser, moduleId: number): Promise<void> {
    const m = await this.getModule(moduleId);
    await this.courses.getManageable(user, m.courseId);
    await this.prisma.module.delete({ where: { id: moduleId } });
  }

  async createLesson(user: AuthUser, moduleId: number, dto: CreateLessonDto) {
    const m = await this.getModule(moduleId);
    await this.courses.getManageable(user, m.courseId);

    const [last, taken] = await Promise.all([
      this.prisma.lesson.findFirst({
        where: { moduleId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      }),
      this.prisma.lesson.findMany({ where: { courseId: m.courseId }, select: { slug: true } }),
    ]);
    const slugs = new Set(taken.map((l) => l.slug));
    const base = slugify(dto.title);
    let slug = base;
    for (let n = 2; slugs.has(slug); n++) slug = `${base}-${n}`;

    const lesson = await this.prisma.lesson.create({
      data: {
        moduleId,
        courseId: m.courseId,
        title: dto.title,
        slug,
        type: dto.type,
        sortOrder: (last?.sortOrder ?? 0) + 1,
        textContent: dto.type === 'Text' ? (dto.textContent ?? null) : null,
        estimatedDurationMinutes: dto.estimatedDurationMinutes ?? null,
        isPreview: dto.isPreview ?? false,
      },
    });
    return {
      id: toPublicId('lesson', lesson.id),
      moduleId: toPublicId('module', lesson.moduleId),
      courseId: toPublicId('course', lesson.courseId),
      title: lesson.title,
      slug: lesson.slug,
      type: lesson.type,
      sortOrder: lesson.sortOrder,
      estimatedDurationMinutes: lesson.estimatedDurationMinutes,
      isPreview: lesson.isPreview,
    };
  }

  async deleteLesson(user: AuthUser, lessonId: number): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { courseId: true },
    });
    if (!lesson) {
      throw new AppException(HttpStatus.NOT_FOUND, 'LESSON_NOT_FOUND', 'Lesson not found.');
    }
    await this.courses.getManageable(user, lesson.courseId);
    await this.prisma.lesson.delete({ where: { id: lessonId } });
  }

  private async getModule(id: number) {
    const m = await this.prisma.module.findUnique({ where: { id } });
    if (!m) throw new AppException(HttpStatus.NOT_FOUND, 'MODULE_NOT_FOUND', 'Module not found.');
    return m;
  }
}

function toModuleResponse(m: { id: number; courseId: number; title: string; sortOrder: number }) {
  return {
    id: toPublicId('module', m.id),
    courseId: toPublicId('course', m.courseId),
    title: m.title,
    sortOrder: m.sortOrder,
  };
}
