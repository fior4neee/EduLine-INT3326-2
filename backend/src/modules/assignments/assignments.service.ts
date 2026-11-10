import { HttpStatus, Injectable } from '@nestjs/common';
import { Assignment, Course, Prisma, Submission, SubmissionType } from '@prisma/client';
import type { AuthUser } from '../../common/auth/auth-user';
import { MAX_FILE_UPLOAD_SIZE_BYTES } from '../../common/config/upload-limits';
import { PrismaService, Tx } from '../../common/database/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import { toPublicId } from '../../common/ids/public-id';
import {
  newObjectKey,
  StorageService,
  SUBMISSION_URL_TTL_SECONDS,
} from '../../common/storage/storage.service';
import { OutboxService } from '../../events/outbox.service';
import { AccessPolicyService } from '../access/access-policy.service';
import { CoursesService } from '../courses/courses.service';
import { slugify } from '../courses/slug';
import { ProgressService } from '../progress/progress.service';
import { toUserSummary } from '../users/user.mapper';
import { extensionOf, isExtensionAllowed, submissionState, submitWindow } from './assignment-rules';
import {
  StudentView,
  toAssignmentResponse,
  toCommentResponse,
  toSubmissionResponse,
} from './assignment.mapper';
import {
  CreateAssignmentDto,
  CreateSubmissionCommentDto,
  GradeSubmissionDto,
  SubmissionUploadUrlDto,
  SubmitAssignmentDto,
  UpdateAssignmentDto,
} from './dto/assignment.dto';

// docs/storage-cdn-iam.md §2: the original file name never goes into the key.
const submissionKeyPrefix = (assignmentId: number, userId: string) =>
  `assignments/${assignmentId}/${userId}`;

type AssignmentWithCourse = Assignment & { course: Pick<Course, 'id' | 'visibility'> };

const notFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found.');
const submissionNotFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'SUBMISSION_NOT_FOUND', 'Submission not found.');
const unprocessable = (code: string, message: string) =>
  new AppException(HttpStatus.UNPROCESSABLE_ENTITY, code, message);

const commentAuthor = { select: { id: true, firstName: true, lastName: true, accountType: true } } as const;

// Owns assignments, submissions and submission comments (docs/m2-plan.md §2–3).
// Every assignment fills a Lesson slot of type Assignment.
@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessPolicyService,
    private readonly courses: CoursesService,
    private readonly progress: ProgressService,
    private readonly outbox: OutboxService,
    private readonly storage: StorageService,
  ) {}

  // ─── Course staff ─────────────────────────────────────────────────────────

  // Creates the lesson slot (at the end of the module) and the assignment together.
  // New assignments are drafts until published.
  async create(user: AuthUser, moduleId: number, dto: CreateAssignmentDto) {
    const m = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!m) throw new AppException(HttpStatus.NOT_FOUND, 'MODULE_NOT_FOUND', 'Module not found.');
    await this.courses.getManageable(user, m.courseId);
    assertDates(dto.unlockAt ?? null, dto.dueAt ?? null);

    const assignment = await this.prisma.$transaction(async (tx) => {
      const last = await tx.lesson.findFirst({
        where: { moduleId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      const lesson = await tx.lesson.create({
        data: {
          moduleId,
          courseId: m.courseId,
          title: dto.title,
          slug: await uniqueLessonSlug(tx, m.courseId, dto.title),
          type: 'Assignment',
          sortOrder: (last?.sortOrder ?? 0) + 1,
          estimatedDurationMinutes: dto.estimatedDurationMinutes ?? null,
        },
      });
      return tx.assignment.create({
        data: {
          lessonId: lesson.id,
          courseId: m.courseId,
          title: dto.title,
          instructions: dto.instructions,
          maxPoints: dto.maxPoints ?? 100,
          submissionTypes: dto.submissionTypes ?? ['TextEntry', 'FileUpload'],
          allowedExtensions: dto.allowedExtensions ?? [],
          unlockAt: dto.unlockAt ?? null,
          dueAt: dto.dueAt ?? null,
          allowLateSubmissions: dto.allowLateSubmissions ?? true,
        },
      });
    });
    return toAssignmentResponse(assignment);
  }

  async update(user: AuthUser, id: number, dto: UpdateAssignmentDto) {
    const a = await this.findOrThrow(id);
    await this.courses.getManageable(user, a.courseId);
    assertDates(
      dto.unlockAt !== undefined ? dto.unlockAt : a.unlockAt,
      dto.dueAt !== undefined ? dto.dueAt : a.dueAt,
    );
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.title !== undefined && dto.title !== a.title) {
        await tx.lesson.update({ where: { id: a.lessonId }, data: { title: dto.title } });
      }
      return tx.assignment.update({
        where: { id },
        data: {
          title: dto.title,
          instructions: dto.instructions,
          maxPoints: dto.maxPoints,
          submissionTypes: dto.submissionTypes,
          allowedExtensions: dto.allowedExtensions,
          unlockAt: dto.unlockAt,
          dueAt: dto.dueAt,
          allowLateSubmissions: dto.allowLateSubmissions,
        },
      });
    });
    return toAssignmentResponse(updated);
  }

  // Makes it visible to students and notifies the class (once).
  async publish(user: AuthUser, id: number) {
    const a = await this.findOrThrow(id);
    await this.courses.getManageable(user, a.courseId);
    const published = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.assignment.updateMany({
        where: { id, publishedAt: null },
        data: { publishedAt: new Date() },
      });
      if (changed.count === 1) {
        await this.outbox.add(tx, 'ASSIGNMENT_PUBLISHED', {
          assignmentId: toPublicId('assignment', id),
          courseId: toPublicId('course', a.courseId),
        });
      }
      return tx.assignment.findUniqueOrThrow({ where: { id } });
    });
    return toAssignmentResponse(published);
  }

  // Deletes the lesson slot, the assignment, its submissions and comments.
  // Students may now have finished every remaining lesson (content service rule).
  async remove(user: AuthUser, id: number): Promise<void> {
    const a = await this.findOrThrow(id);
    await this.courses.getManageable(user, a.courseId);
    await this.prisma.$transaction(async (tx) => {
      await tx.lesson.delete({ where: { id: a.lessonId } });
      await this.progress.recheckCourseCompletion(a.courseId, tx);
    });
  }

  // Gradebook: every student in the course (except Dropped) plus anyone who
  // submitted, with their submission and state. Missing = due date passed.
  async listSubmissions(user: AuthUser, id: number) {
    const a = await this.findOrThrow(id);
    await this.courses.getManageable(user, a.courseId);
    const [enrollments, submissions] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { courseId: a.courseId, status: { not: 'Dropped' } },
        select: { userId: true, status: true },
      }),
      this.prisma.submission.findMany({ where: { assignmentId: id } }),
    ]);
    const byUser = new Map(submissions.map((s) => [s.userId, s]));
    const statusByUser = new Map(enrollments.map((e) => [e.userId, e.status]));
    const userIds = [...new Set([...statusByUser.keys(), ...byUser.keys()])];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    const now = new Date();
    return {
      assignment: toAssignmentResponse(a),
      data: users.map((u) => {
        const s = byUser.get(u.id) ?? null;
        return {
          student: toUserSummary(u),
          enrollmentStatus: statusByUser.get(u.id) ?? null,
          submissionState: submissionState(a, s, now),
          submission: s && toSubmissionResponse(s),
        };
      }),
    };
  }

  async grade(user: AuthUser, submissionId: number, dto: GradeSubmissionDto) {
    const s = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });
    if (!s) throw submissionNotFound();
    await this.courses.getManageable(user, s.assignment.courseId);
    if (dto.score > s.assignment.maxPoints) {
      throw unprocessable(
        'SCORE_OUT_OF_RANGE',
        `Score must be between 0 and ${s.assignment.maxPoints}.`,
      );
    }
    const graded = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.submission.update({
        where: { id: submissionId },
        data: {
          status: 'Graded',
          score: dto.score,
          feedback: dto.feedback === undefined ? undefined : dto.feedback || null,
          gradedById: user.id,
          gradedAt: new Date(),
        },
      });
      await this.outbox.add(tx, 'ASSIGNMENT_GRADED', {
        submissionId: toPublicId('submission', submissionId),
        assignmentId: toPublicId('assignment', s.assignmentId),
        courseId: toPublicId('course', s.assignment.courseId),
        userId: s.userId,
        score: dto.score,
        maxPoints: s.assignment.maxPoints,
      });
      return updated;
    });
    return toSubmissionResponse(graded);
  }

  // ─── Students and staff ───────────────────────────────────────────────────

  async listForCourse(user: AuthUser, courseId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, visibility: true },
    });
    if (!course || !(await this.access.canSeeCourse(user, course))) {
      throw new AppException(HttpStatus.NOT_FOUND, 'COURSE_NOT_FOUND', 'Course not found.');
    }
    const isStaff = await this.access.isCourseStaff(user, courseId);
    if (!isStaff && !(await this.access.canViewContent(user, course))) {
      throw new AppException(HttpStatus.FORBIDDEN, 'NOT_ENROLLED', 'Enroll in the course to see its assignments.');
    }
    const assignments = await this.prisma.assignment.findMany({
      where: { courseId, ...(!isStaff && { publishedAt: { not: null } }) },
      orderBy: [{ lesson: { module: { sortOrder: 'asc' } } }, { lesson: { sortOrder: 'asc' } }],
    });
    if (isStaff) return assignments.map((a) => toAssignmentResponse(a));

    const mine = await this.prisma.submission.findMany({
      where: { userId: user.id, assignmentId: { in: assignments.map((a) => a.id) } },
    });
    const byAssignment = new Map(mine.map((s) => [s.assignmentId, s]));
    const canParticipate = await this.access.canParticipate(user, course);
    return assignments.map((a) => ({
      ...toAssignmentResponse(a, { locked: isLocked(a) }),
      ...studentView(a, byAssignment.get(a.id) ?? null, canParticipate),
    }));
  }

  async get(user: AuthUser, id: number) {
    const a = await this.findWithCourse(id);
    if (await this.access.isCourseStaff(user, a.courseId)) return toAssignmentResponse(a);
    await this.assertStudentCanSee(user, a);
    const mine = await this.prisma.submission.findUnique({
      where: { assignmentId_userId: { assignmentId: id, userId: user.id } },
    });
    const canParticipate = await this.access.canParticipate(user, a.course);
    return {
      ...toAssignmentResponse(a, { locked: isLocked(a) }),
      ...studentView(a, mine, canParticipate),
    };
  }

  // Step 1 of a file submission: a link the browser PUTs the file to (15 min).
  // The file is checked again when it is submitted.
  async submissionUploadUrl(user: AuthUser, id: number, dto: SubmissionUploadUrlDto) {
    const a = await this.findWithCourse(id);
    await this.assertCanSubmit(user, a, 'FileUpload', new Date());
    this.assertFileAllowed(a, dto.fileName, dto.sizeBytes);
    const key = newObjectKey(submissionKeyPrefix(a.id, user.id), extensionOf(dto.fileName));
    const target = await this.storage.signUpload('submissions', key, {
      contentType: dto.contentType || 'application/octet-stream',
      maxBytes: MAX_FILE_UPLOAD_SIZE_BYTES,
    });
    return { key, ...target };
  }

  // A text entry ({textBody}) or an uploaded file ({fileKey, fileName}).
  // Resubmitting replaces it until graded. Submitting completes the Assignment
  // lesson for progress (M3).
  async submit(user: AuthUser, id: number, dto: SubmitAssignmentDto) {
    const isFile = dto.fileKey !== undefined;
    if (isFile === (dto.textBody !== undefined)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_FAILED',
        'Send either textBody or fileKey with fileName.',
      );
    }
    const a = await this.findWithCourse(id);
    const now = new Date();
    const window = await this.assertCanSubmit(user, a, isFile ? 'FileUpload' : 'TextEntry', now);

    let file: Pick<Submission, 'fileKey' | 'fileName' | 'sizeBytes' | 'mimeType'> = {
      fileKey: null,
      fileName: null,
      sizeBytes: null,
      mimeType: null,
    };
    if (isFile) {
      const fileKey = dto.fileKey!;
      const fileName = dto.fileName!;
      if (!fileKey.startsWith(`${submissionKeyPrefix(a.id, user.id)}/`)) {
        throw unprocessable('UPLOAD_NOT_FOUND', 'This file was not uploaded for this assignment.');
      }
      const object = await this.storage.stat('submissions', fileKey);
      if (!object) throw unprocessable('UPLOAD_NOT_FOUND', 'The file has not been uploaded yet.');
      try {
        this.assertFileAllowed(a, fileName, object.sizeBytes);
      } catch (e) {
        await this.storage.deleteQuietly('submissions', fileKey);
        throw e;
      }
      file = { fileKey, fileName, sizeBytes: object.sizeBytes, mimeType: object.contentType };
    }

    const content = {
      textBody: isFile ? null : dto.textBody!,
      ...file,
      isLate: window.late,
      submittedAt: now,
    };
    let replacedFileKey: string | null = null;
    const submission = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.submission.findUnique({
        where: { assignmentId_userId: { assignmentId: id, userId: user.id } },
        select: { id: true, fileKey: true },
      });
      if (existing?.fileKey && existing.fileKey !== content.fileKey) replacedFileKey = existing.fileKey;
      let saved: Submission;
      if (existing) {
        // Only while not graded; a concurrent grade wins.
        const replaced = await tx.submission.updateMany({
          where: { id: existing.id, status: 'Submitted' },
          data: content,
        });
        if (replaced.count === 0) {
          throw unprocessable('ALREADY_GRADED', 'This submission has been graded and cannot be replaced.');
        }
        saved = await tx.submission.findUniqueOrThrow({ where: { id: existing.id } });
      } else {
        try {
          saved = await tx.submission.create({ data: { assignmentId: id, userId: user.id, ...content } });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            throw new AppException(HttpStatus.CONFLICT, 'SUBMISSION_CONFLICT', 'Submitted twice at once. Try again.');
          }
          throw e;
        }
      }
      await this.progress.markLessonCompleted(
        { userId: user.id, courseId: a.courseId, lessonId: a.lessonId },
        tx,
      );
      return saved;
    });
    // The previous file is no longer referenced once the new submission committed.
    await this.storage.deleteQuietly('submissions', replacedFileKey);
    return toSubmissionResponse(submission);
  }

  // Short-lived download link for a submitted file: the student who submitted it
  // or the course staff. Always downloads (never renders in the browser).
  async submissionDownloadUrl(user: AuthUser, submissionId: number) {
    const { submission } = await this.loadSubmissionFor(user, submissionId);
    if (!submission.fileKey) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NO_FILE', 'This submission has no file.');
    }
    const url = await this.storage.signDownload('submissions', submission.fileKey, {
      ttlSeconds: SUBMISSION_URL_TTL_SECONDS,
      downloadName: submission.fileName ?? undefined,
    });
    if (!url) {
      throw new AppException(HttpStatus.NOT_IMPLEMENTED, 'STORAGE_NOT_CONFIGURED', 'File storage is not available on this server yet.');
    }
    return { url, expiresAt: new Date(Date.now() + SUBMISSION_URL_TTL_SECONDS * 1000) };
  }

  // Enrolled, active, the assignment accepts this kind of submission and is open.
  // Returns whether the submission would be late.
  private async assertCanSubmit(user: AuthUser, a: AssignmentWithCourse, type: SubmissionType, now: Date) {
    await this.assertStudentCanSee(user, a);
    if (!(await this.access.canParticipate(user, a.course))) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'SUBMISSION_NOT_ALLOWED',
        'Only a student with an active enrollment can submit.',
      );
    }
    if (!a.submissionTypes.includes(type)) {
      throw unprocessable(
        'SUBMISSION_TYPE_NOT_ALLOWED',
        type === 'TextEntry'
          ? 'This assignment does not accept text entries.'
          : 'This assignment does not accept file uploads.',
      );
    }
    const window = submitWindow(a, now);
    if (window.block === 'NOT_OPEN_YET') {
      throw unprocessable('ASSIGNMENT_NOT_OPEN', 'This assignment is not open for submissions yet.');
    }
    if (window.block === 'CLOSED') {
      throw unprocessable('ASSIGNMENT_CLOSED', 'The due date has passed and late work is not accepted.');
    }
    return window;
  }

  private assertFileAllowed(a: Assignment, fileName: string, sizeBytes: number): void {
    if (!isExtensionAllowed(fileName, a.allowedExtensions)) {
      throw unprocessable(
        'FILE_TYPE_NOT_ALLOWED',
        `Allowed file types: ${a.allowedExtensions.join(', ')}.`,
      );
    }
    if (sizeBytes > MAX_FILE_UPLOAD_SIZE_BYTES) {
      throw unprocessable('FILE_TOO_LARGE', 'The limit is 100 MB.');
    }
  }

  // The student who owns it, or course staff. Anyone else: 404.
  async getSubmission(user: AuthUser, submissionId: number) {
    const { submission } = await this.loadSubmissionFor(user, submissionId);
    return toSubmissionResponse(submission);
  }

  async listComments(user: AuthUser, submissionId: number) {
    await this.loadSubmissionFor(user, submissionId);
    const rows = await this.prisma.submissionComment.findMany({
      where: { submissionId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: { author: commentAuthor },
    });
    return rows.map(toCommentResponse);
  }

  // Notifies the other side: staff when the student writes, the student when staff write.
  async addComment(user: AuthUser, submissionId: number, dto: CreateSubmissionCommentDto) {
    const { submission, isStaff } = await this.loadSubmissionFor(user, submissionId);
    if (!isStaff) {
      const course = await this.prisma.course.findUniqueOrThrow({
        where: { id: submission.assignment.courseId },
        select: { id: true, visibility: true },
      });
      if (!(await this.access.canViewOwnResults(user, course))) {
        throw new AppException(HttpStatus.FORBIDDEN, 'COMMENT_NOT_ALLOWED', 'You can no longer comment here.');
      }
    }
    const comment = await this.prisma.$transaction(async (tx) => {
      const c = await tx.submissionComment.create({
        data: { submissionId, authorId: user.id, body: dto.body },
        include: { author: commentAuthor },
      });
      await this.outbox.add(tx, 'SUBMISSION_COMMENTED', {
        commentId: c.id,
        submissionId: toPublicId('submission', submissionId),
        assignmentId: toPublicId('assignment', submission.assignmentId),
        courseId: toPublicId('course', submission.assignment.courseId),
        authorId: user.id,
        studentId: submission.userId,
      });
      return c;
    });
    return toCommentResponse(comment);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findOrThrow(id: number): Promise<Assignment> {
    const a = await this.prisma.assignment.findUnique({ where: { id } });
    if (!a) throw notFound();
    return a;
  }

  private async findWithCourse(id: number): Promise<AssignmentWithCourse> {
    const a = await this.prisma.assignment.findUnique({
      where: { id },
      include: { course: { select: { id: true, visibility: true } } },
    });
    if (!a) throw notFound();
    return a;
  }

  // Draft assignments and hidden courses answer 404; visible but not enrolled 403.
  private async assertStudentCanSee(user: AuthUser, a: AssignmentWithCourse): Promise<void> {
    if (!a.publishedAt || !(await this.access.canSeeCourse(user, a.course))) throw notFound();
    if (!(await this.access.canViewContent(user, a.course))) {
      throw new AppException(HttpStatus.FORBIDDEN, 'NOT_ENROLLED', 'Enroll in the course to see this assignment.');
    }
  }

  private async loadSubmissionFor(user: AuthUser, submissionId: number) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: { select: { courseId: true } } },
    });
    if (!submission) throw submissionNotFound();
    if (submission.userId === user.id) return { submission, isStaff: false };
    if (await this.access.isCourseStaff(user, submission.assignment.courseId)) {
      return { submission, isStaff: true };
    }
    throw submissionNotFound();
  }
}

function isLocked(a: Pick<Assignment, 'unlockAt'>): boolean {
  return Boolean(a.unlockAt && new Date() < a.unlockAt);
}

function studentView(a: Assignment, s: Submission | null, canParticipate: boolean): StudentView {
  const now = new Date();
  let submitBlockedReason: string | null = null;
  const window = submitWindow(a, now);
  if (!canParticipate) submitBlockedReason = 'ENROLLMENT_NOT_ACTIVE';
  else if (s?.status === 'Graded') submitBlockedReason = 'ALREADY_GRADED';
  else if (window.block === 'NOT_OPEN_YET') submitBlockedReason = 'ASSIGNMENT_NOT_OPEN';
  else if (window.block === 'CLOSED') submitBlockedReason = 'ASSIGNMENT_CLOSED';
  return {
    submissionState: submissionState(a, s, now),
    mySubmission: s && toSubmissionResponse(s),
    submitBlockedReason,
  };
}

function assertDates(unlockAt: Date | null, dueAt: Date | null): void {
  if (unlockAt && dueAt && unlockAt >= dueAt) {
    throw unprocessable('INVALID_ASSIGNMENT_DATES', 'unlockAt must be before dueAt.');
  }
}

async function uniqueLessonSlug(tx: Tx, courseId: number, title: string): Promise<string> {
  const taken = new Set(
    (await tx.lesson.findMany({ where: { courseId }, select: { slug: true } })).map((l) => l.slug),
  );
  const base = slugify(title);
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}
