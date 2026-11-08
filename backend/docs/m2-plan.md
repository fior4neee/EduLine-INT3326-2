# M2 plan: assignments and notifications

Owner: **M2 (Liêm)**. Written 08/11/2026. Status: **phases 1, 2 and 4 done (09/11/2026)**, phase 3 (file uploads) next.

Related: [backend README](../README.md) (data model, §3.7–3.9), [ADR-005](architecture-decisions.md#adr-005-notifications-are-asynchronous-pubsub--outbox) (outbox + Pub/Sub), [rbac-matrix.md](rbac-matrix.md), [m3-plan.md](m3-plan.md) (lesson completion).

---

## 1. Decisions

| # | Decision |
|---|---|
| D1 | A student submits **a file or a text entry**. The instructor chooses which are accepted per assignment, and can restrict files to certain extensions (e.g. only `.pdf`, `.docx`). |
| D2 | **Late work is accepted** by default and flagged late. The instructor can turn this off per assignment; then nothing can be submitted after the due date. |
| D3 | **Personal notifications ignore "Denied".** Grades, replies to your own comments, course completed and welcome messages always arrive. Only course-wide broadcasts follow the student's choice. |
| D4 | A notification can carry an **image** (e.g. the course cover) for a richer display. |
| D5 | **Discussions are postponed.** Course threads, "watch this thread" and comment/reply notifications on threads come later. Comments on a submission (student ↔ instructor) are in scope. |
| D6 | Batching several pending notifications into one is a frontend task. The backend adds an optional `groupKey` so it is easy. |

## 2. Assignment

Existing field names are kept; new fields follow Canvas (the school's LMS).

| Field | Type | Notes |
|---|---|---|
| `title` | string | exists |
| `instructions` | string | exists (the description students read) |
| `unlockAt` | timestamp \| null | "Available from". Before it, students see the title only |
| `dueAt` | timestamp \| null | exists |
| `allowLateSubmissions` | boolean, default `true` | D2. `false` closes submission at `dueAt` |
| `maxPoints` | integer, default 100 | exists |
| `submissionTypes` | `("TextEntry" \| "FileUpload")[]`, at least one | D1 |
| `allowedExtensions` | string[] | exists. Empty = any file type. Only used with `FileUpload` |
| `attachmentKeys` | string[] | the instructor's files; sent as short-lived download links |
| `publishedAt` | timestamp \| null | `null` = draft, invisible to students. Publishing notifies students |

Every assignment fills a Lesson slot of type `Assignment` (existing rule). `POST /modules/{id}/assignments` creates both in one transaction.

**Per-student state** is computed, not stored on the assignment:

| `submissionState` | When |
|---|---|
| `NotSubmitted` | no submission, due date not passed (or no due date) |
| `Missing` | no submission, due date passed |
| `Submitted` | submitted on time |
| `Late` | submitted after `dueAt` |
| `Graded` | graded (the late flag is still shown) |

## 3. Submission

| Change | Notes |
|---|---|
| `textBody` string \| null (new) | text entry, up to 50 000 characters |
| `fileKey`, `fileName`, `sizeBytes`, `mimeType` become nullable | exactly one of text or file is set (checked in code and by a database `CHECK`) |
| `SubmissionComment` table (new) | `submissionId`, `authorId`, `body`, `createdAt`. Visible to the student and course staff only |

Rules:
- The submission type and file extension must be allowed by the assignment (422 `SUBMISSION_TYPE_NOT_ALLOWED` / `FILE_TYPE_NOT_ALLOWED`).
- After `dueAt`: accepted and flagged `isLate` when `allowLateSubmissions`, otherwise 422 `ASSIGNMENT_CLOSED`.
- Resubmitting replaces the submission until it is graded (and, when late work is off, until `dueAt`). Replaces backend README change 25.
- Submitting marks the lesson complete for progress (`ProgressService.markLessonCompleted`, M3).
- Only an Active student can submit (backend README change 60).

## 4. Notification

| Field | Type | Notes |
|---|---|---|
| `title` | string | exists |
| `messageBody` | string | exists (the body text) |
| `isRead` | boolean | exists (same style as `isVerified`, `isLate`) |
| `createdAt` | timestamp | the date |
| `type` | enum | `AssignmentPublished`, `AssignmentDueSoon`, `AssignmentGraded`, `SubmissionComment`, `CourseCompleted`, `CourseWelcome`, `System`. The frontend picks a default icon from it |
| `imageUrl` | string \| null | D4. A **public** image such as the course cover. Never a signed URL (they expire) |
| `actionUrl` | string \| null | exists; the in-app page to open |
| `groupKey` | string \| null | D6, e.g. `asg_3301:comments` |
| `sourceEventId` | uuid | uniqueness changes to **(`sourceEventId`, `recipientId`)**, because one event can notify a whole class |

**Notification permission** is a separate table, not a field on each notification:

`NotificationSubscription { userId, courseId, status: Default | Granted | Denied }`, unique per user and course. The enroll dialog asks "Nhận thông báo từ khóa học này?" and saves the answer. `Default` (never answered) behaves like `Granted`. A `threadId` target is added when discussions arrive (D5).

## 5. Triggers

| Event (outbox) | Notifies | Follows subscription? |
|---|---|---|
| `ASSIGNMENT_PUBLISHED` | Active students of the course | Yes |
| `ASSIGNMENT_DUE_SOON` (due in ≤ 24 h, nothing submitted) | that student | Yes |
| `ASSIGNMENT_GRADED` | that student | No, always (D3) |
| `SUBMISSION_COMMENTED` | the student, or the course's instructors (not the author) | No, always |
| `COURSE_COMPLETED` (written by `EnrollmentsService.markCompleted*`) | that student | No, always |
| `ENROLLMENT_CREATED` + course has a `welcomeMessage` (new Course field) | that student | No, always |

How a notification is created:
1. The change and its outbox event are written in one transaction (exists).
2. `NotificationFanoutService.handle(event)` turns the event into notification rows, skipping duplicates by (`sourceEventId`, `recipientId`).
3. The API processes unpublished outbox rows itself, every few seconds. In production a Cloud Scheduler call to a protected internal route (`POST /internal/outbox/flush`) is the safety net when an instance restarts. Pub/Sub is only needed later for slow external work such as email.
4. The due-soon reminder is a job every 15 minutes (Cloud Scheduler in production, a timer in development). Its event id is derived from (assignment, student), so each student gets at most one reminder per assignment, even if the due date changes.

## 6. Endpoints

**Assignments**

| Method and path | Who |
|---|---|
| `POST /modules/{id}/assignments` | course staff |
| `GET /courses/{id}/assignments` | course staff (all), enrolled students (published only, with `submissionState`) |
| `GET /assignments/{id}` | same; students also get `mySubmission` |
| `PATCH /assignments/{id}`, `DELETE /assignments/{id}`, `POST /assignments/{id}/publish` | course staff |
| `POST /assignments/{id}/submissions` `{textBody}` or `{fileKey, fileName}` | Active student |
| `POST /assignments/{id}/submissions/upload-url` | Active student (needs storage, phase 3) |
| `GET /assignments/{id}/submissions` | course staff: every student, including `Missing` |
| `PATCH /submissions/{id}/grade` `{score, feedback}` | course staff |
| `GET /submissions/{id}/comments`, `POST /submissions/{id}/comments` | the student and course staff |
| `GET /submissions/{id}/download-url` | the student and course staff |

**Notifications**

| Method and path | Who |
|---|---|
| `GET /notifications?unread=&page=` | own only |
| `GET /notifications/unread-count` | own only (frontend polls about every 30 s) |
| `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all` | own only |
| `GET /me/subscriptions`, `PUT /courses/{id}/subscription` `{status}` | own only |

## 7. Phases

| # | Work | Done when |
|---|---|---|
| 1 ✅ | Notification schema changes, read API, subscriptions, outbox processor, fan-out handler | Done: `test/notifications.int-spec.ts` N01–N12 pass, with the full suite (59 tests) |
| 2 ✅ | Assignment and submission schema, CRUD, publish, **text** submissions, grading, submission comments, due-soon job; the notifications in §5. Also: welcome notification on registration | Done: `test/assignments.int-spec.ts` AS01–AS14 and N13 pass, with the full suite (74 tests) |
| 3 | **File** submissions and instructor attachments, through a new `StorageService` (M2 takes this over from M6): `local` driver for development (files in `backend/uploads/`, time-limited links served by the API) and `gcs` driver for production (V4 signed URLs). Chosen by `STORAGE_DRIVER` in `.env` | A student uploads a `.pdf` locally and the instructor downloads it; a wrong extension or a file over 100 MB is rejected |
| 4 ✅ | Frontend: assignment page (Canvas-like), gradebook, notification bell and list, notification question in the enroll dialog, course welcome message editor | Done: browser test of register → welcome, enroll → course welcome, publish → notified, submit + comment, grade → notified |
| later | Discussions, thread subscriptions, comment/reply notifications (D5) | — |

Each phase adds integration tests in `backend/test/` (M3's Jest setup) and updates the backend README change log.

## 8. Open items

| # | Item | Who |
|---|---|---|
| 1 | ~~Where the fan-out handler runs~~ Decided: in the API (outbox processor + Cloud Scheduler flush) | M2 |
| 2 | ~~Storage interface~~ Decided: M2 builds `StorageService` (local + GCS drivers) | M2 |
| 3 | ~~Field renames~~ Decided: keep the existing names (`instructions`, `maxPoints`, `messageBody`) | M2 |
| 4 | Still M6's: email worker (password reset emails print to the log until then), AI tutor, PDF indexing | M6 |
