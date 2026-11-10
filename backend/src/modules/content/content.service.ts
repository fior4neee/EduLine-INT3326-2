import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../../common/auth/auth-user';
import type { EnvironmentVariables } from '../../common/config/env.validation';
import { PrismaService } from '../../common/database/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import { toPublicId } from '../../common/ids/public-id';
import {
  RESOURCE_URL_TTL_SECONDS,
  StorageService,
  VIDEO_URL_TTL_SECONDS,
} from '../../common/storage/storage.service';
import { AccessPolicyService } from '../access/access-policy.service';
import { CoursesService } from '../courses/courses.service';
import { slugify } from '../courses/slug';
import { ProgressService } from '../progress/progress.service';
import { CreateLessonDto, CreateModuleDto } from './dto/content.dto';

const lessonNotFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'LESSON_NOT_FOUND', 'Lesson not found.');

// Owns modules and lessons: create, delete and view. Lesson files are uploaded
// through LessonMediaService. Editing and reordering are not built yet.
@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courses: CoursesService,
    private readonly access: AccessPolicyService,
    private readonly progress: ProgressService,
    private readonly storage: StorageService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  // Lesson viewer. 404 when the caller may not know the course exists, 403 when
  // the course is visible but the lesson is locked (not enrolled, suspended).
  async getLesson(user: AuthUser | undefined, lessonId: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: { select: { id: true, title: true, slug: true, visibility: true } },
        assignments: { select: { id: true }, take: 1 },
        quizzes: { select: { id: true }, take: 1 },
      },
    });
    if (!lesson || !(await this.access.canSeeCourse(user, lesson.course))) throw lessonNotFound();
    if (!(await this.access.canViewLesson(user, lesson.course, lesson))) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'LESSON_LOCKED',
        'Enroll in the course to open this lesson.',
      );
    }

    const [video, downloadableResources] = await Promise.all([
      this.videoUrl(lesson.type, lesson.videoKey),
      this.resourceUrls(lesson.resourceKeys),
    ]);
    return {
      id: toPublicId('lesson', lesson.id),
      moduleId: toPublicId('module', lesson.moduleId),
      courseId: toPublicId('course', lesson.courseId),
      course: {
        id: toPublicId('course', lesson.course.id),
        title: lesson.course.title,
        slug: lesson.course.slug,
      },
      title: lesson.title,
      slug: lesson.slug,
      type: lesson.type,
      sortOrder: lesson.sortOrder,
      estimatedDurationMinutes: lesson.estimatedDurationMinutes,
      isPreview: lesson.isPreview,
      textContent: lesson.textContent,
      videoUrl: video.url,
      // true while no real video is uploaded and a development sample is shown.
      isSampleVideo: video.isSample,
      // Signed links to the lesson's PDFs, in upload order (10 minutes).
      downloadableResources,
      // For Assignment / Quiz lessons: open GET /assignments/{id} or /quizzes/{id}.
      assignmentId: lesson.assignments[0] ? toPublicId('assignment', lesson.assignments[0].id) : null,
      quizId: lesson.quizzes[0] ? toPublicId('quiz', lesson.quizzes[0].id) : null,
    };
  }

  // An uploaded video plays from a signed link (2 hours, so seeking keeps working).
  // A Video lesson without an uploaded file plays DEV_SAMPLE_VIDEO_URL outside
  // production, so progress can be tested end to end. No URL is ever stored.
  private async videoUrl(
    type: string,
    videoKey: string | null,
  ): Promise<{ url: string | null; isSample: boolean }> {
    if (type !== 'Video') return { url: null, isSample: false };
    if (videoKey) {
      const url = await this.storage.signDownload('media', videoKey, { ttlSeconds: VIDEO_URL_TTL_SECONDS });
      return { url, isSample: false };
    }
    const sample = this.config.get('DEV_SAMPLE_VIDEO_URL', { infer: true });
    const isProduction = this.config.get('NODE_ENV', { infer: true }) === 'production';
    return sample && !isProduction ? { url: sample, isSample: true } : { url: null, isSample: false };
  }

  // Links the storage driver cannot sign yet (gcs stub) are left out.
  private async resourceUrls(keys: string[]): Promise<string[]> {
    const urls = await Promise.all(
      keys.map((k) => this.storage.signDownload('media', k, { ttlSeconds: RESOURCE_URL_TTL_SECONDS })),
    );
    return urls.filter((u): u is string => u !== null);
  }

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
    await this.prisma.$transaction(async (tx) => {
      await tx.module.delete({ where: { id: moduleId } });
      await this.progress.recheckCourseCompletion(m.courseId, tx);
    });
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
    if (!lesson) throw lessonNotFound();
    await this.courses.getManageable(user, lesson.courseId);
    // Progress on the lesson is deleted with it (ON DELETE CASCADE), so course
    // percentages are recomputed from the remaining lessons. Students who had
    // finished all of those are now done: complete their enrollments too.
    await this.prisma.$transaction(async (tx) => {
      await tx.lesson.delete({ where: { id: lessonId } });
      await this.progress.recheckCourseCompletion(lesson.courseId, tx);
    });
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
