import { HttpStatus, Injectable } from '@nestjs/common';
import type { Lesson } from '@prisma/client';
import type { AuthUser } from '../../common/auth/auth-user';
import { MAX_FILE_UPLOAD_SIZE_BYTES, MAX_VIDEO_UPLOAD_SIZE_BYTES } from '../../common/config/upload-limits';
import { PrismaService } from '../../common/database/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import { matchesSignature, SIGNATURE_BYTES } from '../../common/storage/file-signature';
import { newObjectKey, StorageService } from '../../common/storage/storage.service';
import { CoursesService } from '../courses/courses.service';
import type { LessonFileKind } from './dto/content.dto';

// At most this many downloadable files per lesson.
const MAX_RESOURCES = 20;

const RULES: Record<LessonFileKind, { types: Record<string, string>; maxBytes: number }> = {
  video: { types: { 'video/mp4': '.mp4', 'video/webm': '.webm' }, maxBytes: MAX_VIDEO_UPLOAD_SIZE_BYTES },
  resource: { types: { 'application/pdf': '.pdf' }, maxBytes: MAX_FILE_UPLOAD_SIZE_BYTES },
};

const unprocessable = (code: string, message: string) =>
  new AppException(HttpStatus.UNPROCESSABLE_ENTITY, code, message);
const lessonNotFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'LESSON_NOT_FOUND', 'Lesson not found.');

const keyPrefix = (l: Pick<Lesson, 'id' | 'courseId'>) => `courses/${l.courseId}/lessons/${l.id}`;

// Instructor uploads of lesson videos and PDFs (docs/storage-cdn-iam.md §3):
// upload-url → the browser PUTs the file to storage → complete verifies it and
// saves its key on the lesson. The API never handles the file bytes.
@Injectable()
export class LessonMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courses: CoursesService,
    private readonly storage: StorageService,
  ) {}

  async uploadUrl(user: AuthUser, lessonId: number, kind: LessonFileKind, contentType: string, sizeBytes: number) {
    const lesson = await this.manageableLesson(user, lessonId);
    const extension = this.check(lesson, kind, contentType, sizeBytes);
    const key = newObjectKey(keyPrefix(lesson), extension);
    const target = await this.storage.signUpload('media', key, {
      contentType,
      maxBytes: RULES[kind].maxBytes,
    });
    return { key, ...target };
  }

  // Verifies the uploaded object, then attaches it. A bad file is deleted.
  async complete(user: AuthUser, lessonId: number, kind: LessonFileKind, key: string): Promise<void> {
    const lesson = await this.manageableLesson(user, lessonId);
    if (!key.startsWith(`${keyPrefix(lesson)}/`)) {
      throw unprocessable('UPLOAD_NOT_FOUND', 'This file was not uploaded for this lesson.');
    }
    const object = await this.storage.stat('media', key);
    if (!object) throw unprocessable('UPLOAD_NOT_FOUND', 'The file has not been uploaded yet.');

    const reject = async (code: string, message: string) => {
      await this.storage.deleteQuietly('media', key);
      return unprocessable(code, message);
    };
    if (object.sizeBytes > RULES[kind].maxBytes) {
      throw await reject('FILE_TOO_LARGE', 'The file is larger than allowed.');
    }
    if (!(object.contentType in RULES[kind].types)) {
      throw await reject('FILE_TYPE_NOT_ALLOWED', 'This file type is not allowed here.');
    }
    const head = await this.storage.readStart('media', key, SIGNATURE_BYTES);
    if (!matchesSignature(object.contentType, head)) {
      throw await reject('FILE_CONTENT_MISMATCH', 'The file content does not match its type.');
    }

    if (kind === 'video') {
      await this.prisma.lesson.update({ where: { id: lessonId }, data: { videoKey: key } });
      // New upload = new key; the replaced video is no longer referenced.
      if (lesson.videoKey && lesson.videoKey !== key) await this.storage.deleteQuietly('media', lesson.videoKey);
    } else if (!lesson.resourceKeys.includes(key)) {
      if (lesson.resourceKeys.length >= MAX_RESOURCES) {
        throw await reject('TOO_MANY_RESOURCES', `A lesson can have at most ${MAX_RESOURCES} files.`);
      }
      await this.prisma.lesson.update({ where: { id: lessonId }, data: { resourceKeys: { push: key } } });
    }
  }

  async removeVideo(user: AuthUser, lessonId: number): Promise<void> {
    const lesson = await this.manageableLesson(user, lessonId);
    if (!lesson.videoKey) return;
    await this.prisma.lesson.update({ where: { id: lessonId }, data: { videoKey: null } });
    await this.storage.deleteQuietly('media', lesson.videoKey);
  }

  // `index` is the position in the lesson's downloadableResources.
  async removeResource(user: AuthUser, lessonId: number, index: number): Promise<void> {
    const lesson = await this.manageableLesson(user, lessonId);
    const key = lesson.resourceKeys[index];
    if (key === undefined) {
      throw new AppException(HttpStatus.NOT_FOUND, 'RESOURCE_NOT_FOUND', 'No file at this position.');
    }
    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { resourceKeys: lesson.resourceKeys.filter((_, i) => i !== index) },
    });
    await this.storage.deleteQuietly('media', key);
  }

  private async manageableLesson(user: AuthUser, lessonId: number) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw lessonNotFound();
    await this.courses.getManageable(user, lesson.courseId);
    return lesson;
  }

  // Returns the file extension for the key.
  private check(lesson: Lesson, kind: LessonFileKind, contentType: string, sizeBytes: number): string {
    if (kind === 'video' && lesson.type !== 'Video') {
      throw unprocessable('LESSON_TYPE_NOT_SUPPORTED', 'Only video lessons have a video.');
    }
    if (lesson.type === 'Quiz' || lesson.type === 'Assignment') {
      throw unprocessable('LESSON_TYPE_NOT_SUPPORTED', 'Quiz and assignment lessons have no files here.');
    }
    const extension = RULES[kind].types[contentType];
    if (!extension) {
      const allowed = Object.keys(RULES[kind].types).join(', ');
      throw unprocessable('FILE_TYPE_NOT_ALLOWED', `Allowed types: ${allowed}.`);
    }
    if (sizeBytes > RULES[kind].maxBytes) {
      throw unprocessable('FILE_TOO_LARGE', `The limit is ${RULES[kind].maxBytes / (1024 * 1024)} MB.`);
    }
    return extension;
  }
}
