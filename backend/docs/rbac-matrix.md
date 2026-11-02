# RBAC Matrix and Authorization Tests (M1, Week 3–6)

Based on `backend/README.md` (§2, §3.2, §3.3, §3.8) and `schema.prisma`. Where the root README §9 differs, this file follows the backend README.

## 1. Two layers

| Layer | Question | NestJS piece |
|---|---|---|
| Role | What kind of account is this? (`accountType`) | `JwtAuthGuard` + `RolesGuard` + `@Roles()` |
| Resource | What is this user's relationship to **this** course / attempt / submission? | `AccessPolicy` service, called from guards or services |

A role check alone is never enough for a course resource. Every handler that takes a `:courseId`, `:lessonId`, `:quizId`, `:attemptId`, `:assignmentId` or `:submissionId` must resolve the course and call `AccessPolicy`.

## 2. AccessPolicy functions

All rules in one service so every module uses the same logic.

| Function | Returns true when |
|---|---|
| `isCourseStaff(user, courseId)` | `user.accountType = Admin`, **or** a `CourseInstructor(courseId, user.id)` row exists |
| `canSeeCourse(user, course)` | `course.visibility ∈ {Public, Restricted}`, **or** `isCourseStaff`, **or** (`Archived` and the user has an enrollment in `Active`/`Completed`) |
| `canViewContent(user, course)` | `isCourseStaff`, **or** enrollment `status ∈ {Active, Completed}` and `visibility ≠ Draft` |
| `canViewLesson(user, course, lesson)` | `lesson.isPreview` and course `Public`/`Restricted` and the user is not Suspended in it (anonymous allowed), **or** `canViewContent` |
| `canViewOwnResults(user, course)` | `isCourseStaff`, **or** enrollment `status ∈ {Active, Completed}` |
| `canParticipate(user, course)` (take quiz, submit) | `user.accountType = Student`, enrollment `status = Active`, `visibility ∈ {Public, Restricted}` |
| `canEnroll(user, course)` | Student; `visibility ∈ {Public, Restricted}`; now within `[enrollmentOpensAt, enrollmentClosesAt]` (null = open); every prerequisite has an enrollment `Completed`; no enrollment, or enrollment `Dropped`; correct course password when `Restricted` |

Suspended students fail `canViewContent`, `canParticipate` and `canEnroll` for that course (backend README §3.3). **Completed** students keep read-only content and their results, but fail `canParticipate` (integration-review #18).

Implemented in `backend/src/modules/access/access-policy.service.ts` (`assertEnrollmentRules` = the course-side part of `canEnroll`).

## 3. Status code policy

| Situation | Code | Why |
|---|---|---|
| No / invalid / expired access token | **401** | Client should refresh or log in |
| Logged in, resource exists and is visible, but not allowed | **403** | e.g. student not enrolled opens a lesson |
| Resource the user is not allowed to know exists (Draft course, another student's attempt or submission) | **404** | Do not leak existence (no ID enumeration) |
| Business rule (window closed, prerequisite missing, max attempts) | **422** | Request is valid, rule says no |
| Duplicate (already enrolled) | **409** | |
| Too many requests | **429** | |

## 4. Endpoint matrix

Legend: ✅ allowed · ⛔ 403 · 🔒 401 · 👻 404 · *Staff* = instructor listed on the course, or Admin · *Other instr.* = instructor **not** listed on the course.

### Auth and users

| Endpoint | Anonymous | Student | Instructor | Admin | Notes |
|---|---|---|---|---|---|
| `POST /auth/register` | ✅ | ✅ | ✅ | ✅ | Always creates `Student`. `accountType: "Instructor"` adds a Pending instructor request; `"Admin"` → 400 |
| `POST /auth/forgot-password`, `/auth/reset-password` | ✅ | ✅ | ✅ | ✅ | Rate limited; same `202` for unknown emails |
| `POST /auth/login` | ✅ | ✅ | ✅ | ✅ | Rate limited |
| `POST /auth/refresh`, `/auth/logout` | ✅ (needs refresh token) | ✅ | ✅ | ✅ | Reused revoked token → whole family revoked |
| `GET/PATCH /users/me`, `PATCH /users/me/password` | 🔒 | ✅ | ✅ | ✅ | `PATCH /users/me` must not accept `accountType`, `email` verification flags |
| `POST /users/me/instructor-request` | 🔒 | ✅ | ⛔ (422) | ⛔ (422) | Students only; 409 if already Pending |
| `GET/PATCH /admin/users…`, `POST /admin/users/:id/instructor-request/approve\|reject` | 🔒 | ⛔ | ⛔ | ✅ | Only routes that change `accountType`; an Admin cannot change their own |

### Courses and enrollment

| Endpoint | Anonymous | Student | Staff | Other instr. | Notes |
|---|---|---|---|---|---|
| `GET /courses` (catalog) | ✅ | ✅ | ✅ | ✅ | Only `Public` + `Restricted`; never `Draft`/`Archived` |
| `GET /courses/:id` | ✅ if Public/Restricted | same | ✅ any status | 👻 if Draft | Never returns `accessPasswordHash`, only `requiresPassword` |
| `POST /courses` | 🔒 | ⛔ | ✅ | ✅ | Creator added to `CourseInstructor` |
| `PATCH /courses/:id`, publish, archive (`DELETE`) | 🔒 | ⛔ | ✅ | ⛔ | Archive = soft delete |
| `GET /instructor/courses` | 🔒 | ⛔ | ✅ | ✅ own only | |
| `POST /courses/:id/enroll` | 🔒 | ✅ if `canEnroll` | ⛔ | ⛔ | 409 already Active; 422 window/prerequisite; ⛔ wrong course password |
| `DELETE /courses/:id/enroll` | 🔒 | ✅ own | ⛔ | ⛔ | → `Dropped` |
| `GET /me/courses` | 🔒 | ✅ | ✅ (empty) | ✅ (empty) | |
| `GET /courses/:id/students` | 🔒 | ⛔ | ✅ | ⛔ | |
| Suspend / un-suspend enrollment | 🔒 | ⛔ | ✅ | ⛔ | Only when `timesEnrolled ≥ 2` and `completedAt = null` (422 otherwise) |

### Content

| Endpoint | Anonymous | Student enrolled (Active/Completed) | Student not enrolled / Dropped / Suspended | Staff | Other instr. |
|---|---|---|---|---|---|
| Module/lesson create, edit, reorder, delete | 🔒 | ⛔ | ⛔ | ✅ | ⛔ |
| `POST /lessons/:id/content/upload-url`, `/complete` | 🔒 | ⛔ | ⛔ | ✅ | ⛔ |
| `GET /lessons/:id` (metadata + signed URLs) | 🔒 | ✅ | ⛔ (✅ if `isPreview`, except Suspended) | ✅ | ⛔ |

### Quizzes (week 6)

| Endpoint | Student enrolled Active | Student not enrolled / Suspended | Staff | Other instr. | Notes |
|---|---|---|---|---|---|
| Quiz/question CRUD, publish | ⛔ | ⛔ | ✅ | ⛔ | |
| `GET /quizzes/:id` | ✅ **without** `correctOptionIndex` | ⛔ | ✅ with answers | ⛔ | Test that the field is absent, not `null` |
| `POST /quizzes/:id/attempts` | ✅ | ⛔ | ⛔ | ⛔ | Staff/Admin do not take quizzes |
| `PUT /attempts/:id/answers`, `POST /attempts/:id/submit` | ✅ own attempt | 👻 | 👻 | 👻 | Someone else's attempt → 404 |
| `GET /attempts/:id` | ✅ own | 👻 | ✅ | 👻 | |
| `GET /quizzes/:id/attempts` | ⛔ | ⛔ | ✅ | ⛔ | |

### Assignments and submissions (week 6)

| Endpoint | Student enrolled Active | Student not enrolled / Suspended | Staff | Other instr. | Notes |
|---|---|---|---|---|---|
| Assignment CRUD | ⛔ | ⛔ | ✅ | ⛔ | |
| `GET /courses/:id/assignments`, `GET /assignments/:id` | ✅ | ⛔ | ✅ | ⛔ | |
| `POST …/submissions/upload-url`, `POST …/submissions` | ✅ | ⛔ | ⛔ | ⛔ | 100 MB, extension in `allowedExtensions`; resubmit only before `dueAt` and before graded (422) |
| `GET /assignments/:id/submissions/me` | ✅ | ⛔ | — | — | |
| `GET /assignments/:id/submissions` | ⛔ | ⛔ | ✅ | ⛔ | |
| `GET /submissions/:id/download-url` | ✅ own | 👻 | ✅ | 👻 | |
| `PATCH /submissions/:id/grade` | ⛔ | ⛔ | ✅ | ⛔ | `0 ≤ score ≤ maxPoints` |

### Notifications (week 7)

| Endpoint | Anonymous | Any logged-in user | Notes |
|---|---|---|---|
| `GET /notifications`, `/unread-count`, `PATCH …/read`, `read-all` | 🔒 | ✅ own only | Marking another user's notification → 404 |

## 5. Test cases

Seed for the tests: `admin`, `instr_a` (listed on Course A), `instr_b` (not listed), `stu_1` enrolled Active in A, `stu_2` not enrolled, `stu_3` Suspended in A. Course A `Public`, Course D `Draft` (instr_a), Course R `Restricted` (password `Demo#2026`), Course P requires A Completed.

| ID | Week | Request | As | Expected |
|---|---|---|---|---|
| T01 | 3 | `GET /users/me` without token | anon | 401 |
| T02 | 3 | `GET /users/me` with expired access token | stu_1 | 401 |
| T03 | 3 | `POST /auth/register` with `"accountType":"Admin"` | anon | 400 or created as Student |
| T04 | 3 | `PATCH /users/me {"accountType":"Admin"}` | stu_1 | 400, role unchanged |
| T05 | 3 | `PATCH /admin/users/:id {"accountType":"Instructor"}` | instr_a | 403 |
| T06 | 3 | Same as T05 | admin | 200 |
| T07 | 3 | Refresh twice with the same refresh token | stu_1 | 2nd call 401, all tokens of that family revoked |
| T08 | 3 | `GET /courses` | anon | Contains A, R; not D |
| T09 | 3 | `GET /courses/:D` | stu_2 | 404 |
| T10 | 3 | `GET /courses/:D` | instr_a | 200 |
| T11 | 3 | `POST /courses` | stu_1 | 403 |
| T12 | 3 | `PATCH /courses/:A` | instr_b | 403 |
| T13 | 3 | `PATCH /courses/:A` | instr_a / admin | 200 |
| T14 | 3 | `POST /courses/:A/enroll` | stu_1 (already Active) | 409 |
| T15 | 3 | `POST /courses/:R/enroll` wrong password | stu_2 | 403 |
| T16 | 3 | `POST /courses/:P/enroll` (A not Completed) | stu_2 | 422 |
| T17 | 3 | Enroll after `enrollmentClosesAt` | stu_2 | 422 |
| T18 | 3 | `POST /courses/:A/enroll` | stu_3 (Suspended) | 403 |
| T19 | 3 | `POST /courses/:A/enroll` | instr_a | 403 |
| T20 | 3 | Suspend stu_1 with `timesEnrolled = 1` | instr_a | 422 |
| T21 | 4 | `GET /lessons/:A-lesson` | stu_1 | 200, signed URL present |
| T22 | 4 | `GET /lessons/:A-lesson` | stu_2 / stu_3 | 403, no URL in body |
| T23 | 4 | Use stu_1's signed URL after expiry | anyone | 403 from CDN/GCS |
| T24 | 4 | `GET https://storage.googleapis.com/<media-bucket>/<key>` without signature | anon | 403 |
| T25 | 4 | `POST /lessons/:A-lesson/content/upload-url` | instr_b | 403 |
| T26 | 6 | `GET /quizzes/:id` | stu_1 | 200, no `correctOptionIndex` key anywhere |
| T27 | 6 | `POST /attempts/:stu_1-attempt/submit` | stu_2 | 404 |
| T28 | 6 | `POST /quizzes/:id/attempts` | stu_3 | 403 |
| T29 | 6 | `GET /submissions/:stu_1-sub/download-url` | stu_2 | 404 |
| T30 | 6 | `PATCH /submissions/:id/grade {"score": 999}` | instr_a | 400 |
| T31 | 7 | `PATCH /notifications/:stu_1-ntf/read` | stu_2 | 404 |

Implementation: Jest + Supertest e2e in `backend/test/rbac.e2e-spec.ts`, one `describe` per week, run in CI against the docker-compose Postgres. A failing RBAC test blocks the merge.
