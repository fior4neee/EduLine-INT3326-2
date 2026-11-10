import { Course, Lesson, User } from '@prisma/client';
import { StorageService } from '../src/common/storage/storage.service';
import { createTestApp, enroll, makeCourse, makeUser, resetDatabase, TestApp } from './helpers/app';

// File uploads with the local storage driver (docs/cloud-data-plan.md 6.2, 6.4):
// lesson videos and PDFs from instructors, and file submissions from students.
describe('file uploads (local storage driver)', () => {
  let t: TestApp;
  let instructor: User;
  let student: User;
  let course: Course;
  let lessons: Lesson[];
  let asInstructor: { Authorization: string };
  let asStudent: { Authorization: string };

  const api = (path: string) => `/api/v1${path}`;
  // Upload/download links are absolute (http://localhost:PORT/api/v1/…); supertest needs the path.
  const pathOf = (url: string) => new URL(url).pathname;

  // Smallest files whose first bytes pass the signature check.
  const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(64, 1)]);
  const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
  const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64, 2)]);

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    instructor = await makeUser(t.prisma, 'Instructor');
    student = await makeUser(t.prisma);
    ({ course, lessons } = await makeCourse(t.prisma, instructor, ['Video', 'Text']));
    await enroll(t.prisma, student, course.id);
    asInstructor = { Authorization: `Bearer ${await t.tokenFor(instructor)}` };
    asStudent = { Authorization: `Bearer ${await t.tokenFor(student)}` };
  });

  const uploadLessonFile = async (lessonId: number, kind: 'video' | 'resource', contentType: string, bytes: Buffer) => {
    const target = await t
      .http()
      .post(api(`/lessons/${lessonId}/content/upload-url`))
      .set(asInstructor)
      .send({ kind, contentType, sizeBytes: bytes.length })
      .expect(201);
    await t.http().put(pathOf(target.body.uploadUrl)).set(target.body.headers).send(bytes).expect(200);
    return target.body.key as string;
  };

  it('U01: an uploaded video plays from a signed link, with range requests', async () => {
    const video = lessons[0];
    const key = await uploadLessonFile(video.id, 'video', 'video/mp4', MP4);
    expect(key).toMatch(new RegExp(`^courses/${course.id}/lessons/${video.id}/[0-9a-f-]{36}\\.mp4$`));

    const done = await t
      .http()
      .post(api(`/lessons/${video.id}/content/complete`))
      .set(asInstructor)
      .send({ kind: 'video', key })
      .expect(200);
    expect(done.body.isSampleVideo).toBe(false);

    const lesson = await t.http().get(api(`/lessons/${video.id}`)).set(asStudent).expect(200);
    const file = await t.http().get(pathOf(lesson.body.videoUrl)).expect(200);
    expect(file.headers['content-type']).toBe('video/mp4');
    expect(Buffer.from(file.body).equals(MP4)).toBe(true);
    const part = await t.http().get(pathOf(lesson.body.videoUrl)).set('Range', 'bytes=4-11').expect(206);
    expect(Buffer.from(part.body).toString('latin1')).toBe('ftypisom');
  });

  it('U02: a PDF resource is listed; an .exe sent as PDF is rejected and deleted', async () => {
    const text = lessons[1];
    const key = await uploadLessonFile(text.id, 'resource', 'application/pdf', PDF);
    await t.http().post(api(`/lessons/${text.id}/content/complete`)).set(asInstructor).send({ kind: 'resource', key }).expect(200);

    const bad = await uploadLessonFile(text.id, 'resource', 'application/pdf', EXE);
    const res = await t
      .http()
      .post(api(`/lessons/${text.id}/content/complete`))
      .set(asInstructor)
      .send({ kind: 'resource', key: bad })
      .expect(422);
    expect(res.body.error.code).toBe('FILE_CONTENT_MISMATCH');
    expect(await t.app.get(StorageService).stat('media', bad)).toBeNull();

    const lesson = await t.http().get(api(`/lessons/${text.id}`)).set(asStudent).expect(200);
    expect(lesson.body.downloadableResources).toHaveLength(1);
    await t.http().delete(api(`/lessons/${text.id}/content/resources/0`)).set(asInstructor).expect(204);
    expect(await t.app.get(StorageService).stat('media', key)).toBeNull();
  });

  it('U03: wrong type, too large, wrong lesson type, not staff, tampered link', async () => {
    const post = (lessonId: number, body: object, who = asInstructor) =>
      t.http().post(api(`/lessons/${lessonId}/content/upload-url`)).set(who).send(body);
    expect((await post(lessons[0].id, { kind: 'video', contentType: 'video/x-msvideo', sizeBytes: 10 }).expect(422)).body.error.code).toBe('FILE_TYPE_NOT_ALLOWED');
    expect((await post(lessons[0].id, { kind: 'video', contentType: 'video/mp4', sizeBytes: 201 * 1024 * 1024 }).expect(422)).body.error.code).toBe('FILE_TOO_LARGE');
    expect((await post(lessons[1].id, { kind: 'video', contentType: 'video/mp4', sizeBytes: 10 }).expect(422)).body.error.code).toBe('LESSON_TYPE_NOT_SUPPORTED');
    await post(lessons[0].id, { kind: 'video', contentType: 'video/mp4', sizeBytes: 10 }, asStudent).expect(403);

    const target = (await post(lessons[0].id, { kind: 'video', contentType: 'video/mp4', sizeBytes: 10 }).expect(201)).body;
    const tampered = pathOf(target.uploadUrl).replace(/.$/, (c: string) => (c === 'A' ? 'B' : 'A'));
    await t.http().put(tampered).set(target.headers).send(MP4).expect(404);
  });

  it('U04: the upload link refuses bytes past the signed size limit', async () => {
    const storage = t.app.get(StorageService);
    const target = await storage.signUpload('media', `courses/${course.id}/lessons/${lessons[0].id}/limit.mp4`, {
      contentType: 'video/mp4',
      maxBytes: 16,
    });
    const res = await t.http().put(pathOf(target.uploadUrl)).set(target.headers).send(MP4).expect(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  describe('file submissions', () => {
    const createPublished = async (body: object = {}) => {
      const a = (
        await t
          .http()
          .post(api(`/modules/${lessons[0].moduleId}/assignments`))
          .set(asInstructor)
          .send({ title: 'Nộp báo cáo', instructions: 'PDF.', submissionTypes: ['FileUpload'], allowedExtensions: ['.pdf'], ...body })
          .expect(201)
      ).body;
      await t.http().post(api(`/assignments/${a.id}/publish`)).set(asInstructor).expect(200);
      return a;
    };
    const uploadSubmission = async (assignmentId: string, fileName: string, bytes: Buffer, who = asStudent) => {
      const target = await t
        .http()
        .post(api(`/assignments/${assignmentId}/submissions/upload-url`))
        .set(who)
        .send({ fileName, contentType: 'application/pdf', sizeBytes: bytes.length })
        .expect(201);
      await t.http().put(pathOf(target.body.uploadUrl)).set(target.body.headers).send(bytes).expect(200);
      return target.body.key as string;
    };

    it('F01: upload, submit, then the student and the instructor can download it', async () => {
      const a = await createPublished();
      const fileKey = await uploadSubmission(a.id, 'Bao cao.PDF', PDF);
      expect(fileKey).toMatch(new RegExp(`^assignments/${a.id.replace('asg_', '')}/${student.id}/[0-9a-f-]{36}\\.pdf$`));

      const sub = await t
        .http()
        .post(api(`/assignments/${a.id}/submissions`))
        .set(asStudent)
        .send({ fileKey, fileName: 'Bao cao.PDF' })
        .expect(201);
      expect(sub.body).toMatchObject({ fileName: 'Bao cao.PDF', sizeBytes: PDF.length, textBody: null, status: 'Submitted' });
      expect(sub.body.fileKey).toBeUndefined();

      for (const who of [asStudent, asInstructor]) {
        const link = await t.http().get(api(`/submissions/${sub.body.id}/download-url`)).set(who).expect(200);
        const file = await t.http().get(pathOf(link.body.url)).expect(200);
        expect(file.headers['content-disposition']).toContain('attachment');
        expect(Buffer.from(file.body).equals(PDF)).toBe(true);
      }

      const other = await makeUser(t.prisma);
      await enroll(t.prisma, other, course.id);
      const asOther = { Authorization: `Bearer ${await t.tokenFor(other)}` };
      await t.http().get(api(`/submissions/${sub.body.id}/download-url`)).set(asOther).expect(404);
    });

    it("F02: wrong extension, text on a file-only assignment, both fields, another student's key", async () => {
      const a = await createPublished();
      const ext = await t
        .http()
        .post(api(`/assignments/${a.id}/submissions/upload-url`))
        .set(asStudent)
        .send({ fileName: 'virus.exe', sizeBytes: 10 })
        .expect(422);
      expect(ext.body.error.code).toBe('FILE_TYPE_NOT_ALLOWED');

      const text = await t.http().post(api(`/assignments/${a.id}/submissions`)).set(asStudent).send({ textBody: 'x' }).expect(422);
      expect(text.body.error.code).toBe('SUBMISSION_TYPE_NOT_ALLOWED');

      const fileKey = await uploadSubmission(a.id, 'a.pdf', PDF);
      await t.http().post(api(`/assignments/${a.id}/submissions`)).set(asStudent).send({ textBody: 'x', fileKey, fileName: 'a.pdf' }).expect(400);

      const other = await makeUser(t.prisma);
      await enroll(t.prisma, other, course.id);
      const asOther = { Authorization: `Bearer ${await t.tokenFor(other)}` };
      const stolen = await t
        .http()
        .post(api(`/assignments/${a.id}/submissions`))
        .set(asOther)
        .send({ fileKey, fileName: 'a.pdf' })
        .expect(422);
      expect(stolen.body.error.code).toBe('UPLOAD_NOT_FOUND');
    });

    it('F03: resubmitting a file replaces it and deletes the old one', async () => {
      const a = await createPublished();
      const first = await uploadSubmission(a.id, 'v1.pdf', PDF);
      await t.http().post(api(`/assignments/${a.id}/submissions`)).set(asStudent).send({ fileKey: first, fileName: 'v1.pdf' }).expect(201);
      const second = await uploadSubmission(a.id, 'v2.pdf', PDF);
      const res = await t.http().post(api(`/assignments/${a.id}/submissions`)).set(asStudent).send({ fileKey: second, fileName: 'v2.pdf' }).expect(201);
      expect(res.body.fileName).toBe('v2.pdf');
      expect(await t.app.get(StorageService).stat('submissions', first)).toBeNull();
      expect(await t.app.get(StorageService).stat('submissions', second)).not.toBeNull();
    });
  });
});
