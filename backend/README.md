# EduLine Backend: M2 Data Model

Tài khoản admin để test: admin / Admin#2026

Install Node 22 LTS or newer (check with node -v)
Start Docker Desktop, then start Postgres: cd infrastructure → docker compose up -d
cd ../backend
Create the env file: cp .env.example .env, then set JWT_ACCESS_SECRET to 32 or more random characters
npm ci (installs the exact versions from package-lock.json)
Ignore the @scarf/scarf install-script warning
npx prisma migrate deploy (creates the tables)
npm run seed (creates the admin account above)
npm run start:dev
Open Swagger at http://localhost:8000/api/docs <---- cái này giúp m test các api và nhìn thấy các endpoint
In dev, password reset links are printed in the API terminal instead of being emailed
Full endpoint list: §8 of backend/README.md

This folder holds the EduLine API (NestJS + Prisma) and the data model for the M2 modules: auth, users, courses, enrollments, content (modules and lessons), quizzes, assignments, submissions and notifications.

| File | What it is |
|---|---|
| [prisma/schema.prisma](prisma/schema.prisma) | Database schema (PostgreSQL, Prisma). Source of truth for tables, fields, relations and indexes. |
| [prisma/migrations/](prisma/migrations/) | Versioned SQL migrations. `20261102000000_init` creates every table plus the hand-written partial index for quiz attempts. |
| [prisma/seed.ts](prisma/seed.ts) | Creates the first Admin account from `SEED_ADMIN_*` in `.env`. |
| [src/modules/auth/password-policy.ts](src/modules/auth/password-policy.ts) | Password rules used by registration, password change and password reset. |
| [src/common/config/upload-limits.ts](src/common/config/upload-limits.ts) | Maximum upload sizes: 200 MB for lesson videos, 100 MB for every other file. |
| [.env.example](.env.example) | Every environment variable the API reads. The API refuses to start if one is invalid. |

### Run it locally

Start Docker Desktop first and wait for "Engine running".

```bash
cd infrastructure
cp -n .env.example .env                         # Postgres user/password for docker compose
docker compose up -d                            # PostgreSQL on :5432
docker compose ps                               # wait until eduline-postgres is "healthy"
cd ../backend
cp -n .env.example .env                         # then set JWT_ACCESS_SECRET to 32+ random characters
npm install
npx prisma generate
npx prisma migrate deploy                       # create the tables
npm run seed                                    # create the Admin account (admin / Admin#2026)
npm run seed:demo                               # optional: demo instructors, student and 8 courses
npm run seed:catalog                            # optional: 5 VMLU-topic courses from data/courses/*.json
npm run start:dev                               # http://localhost:8000/api/v1
```

### PowerShell (Windows)

Start Docker Desktop first and wait for "Engine running". Run these from the repository root.

```powershell
# Create the Postgres settings file (only if missing) and start the PostgreSQL container
cd infrastructure
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d

# Wait until eduline-postgres shows "healthy"
docker compose ps

# Move to the backend folder and copy the environment template (only if missing)
cd ..\backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

# Replace the placeholder JWT_ACCESS_SECRET with 64 random characters
$b = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
$secret = [Convert]::ToBase64String($b)
(Get-Content .env) -replace '^JWT_ACCESS_SECRET=replace-with-at-least-32-random-characters$', "JWT_ACCESS_SECRET=$secret" | Set-Content .env -Encoding ascii

# Install dependencies and set up the database
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed

# Optional: Add demo instructors, student, and 8 courses
npm run seed:demo

# Optional: Add 5 courses (C, networking, statistics, macroeconomics, Vietnamese culture) with VMLU quizzes
npm run seed:catalog

# Start the application in development mode (http://localhost:8000/api/v1)
npm run start:dev
```

- Swagger: http://localhost:8000/api/docs · health check: `GET /api/v1/health`
- The API listens on **port 8000**, which is what `frontend/.env.development` points at.
- With `MAIL_TRANSPORT=console` (the default), password reset links are printed in the API log instead of emailed.

### Code layout

```
src/
├── main.ts                    helmet, CORS, /api/v1 prefix, Swagger
├── app.module.ts              global guards (JWT → roles → rate limit), validation pipe, error filter
├── common/                    shared by every module
│   ├── auth/                  access token signing/verification
│   ├── config/                env validation, upload limits
│   ├── database/              PrismaService
│   ├── decorators/            @Public() @Roles() @CurrentUser() @AuthRateLimit()
│   ├── errors/                AppException + filter → { error: { code, message, details, requestId } }
│   ├── guards/                JwtAuthGuard, RolesGuard, UserThrottlerGuard
│   ├── ids/                   crs_1234 ↔ 1234 (toPublicId, @IdParam, PublicIdArray)
│   ├── logging/               request id + one log line per request
│   ├── mail/                  MailService (console in dev, outbox → worker in prod)
│   ├── pagination/            { data, meta } lists, pageSize ≤ 100
│   └── security/              argon2id, SHA-256, random tokens
├── events/                    OutboxService + event contracts
└── modules/
    ├── access/                AccessPolicyService: every course-level permission rule
    ├── auth/                  register/login/refresh/logout, forgot/reset, /users/me…
    ├── users/                 UsersService, /admin/users…
    ├── courses/               course CRUD, publish, archive, co-instructors
    ├── enrollments/           enroll, drop, My Courses, students, suspend
    └── health/
```

Module rule: a module writes only its own tables and calls other modules through their exported service. `AccessPolicyService` is the one exception: it reads `course_instructors`, `course_prerequisites` and `enrollments` so that every module applies the same permission rules.

The backend framework is **NestJS** (TypeScript) with **Prisma** for the database.

### Tech stack

| Thành Phần | Công Nghệ | Mục Đích |
|---|---|---|
| Framework backend | **NestJS** | Mỗi chức năng (auth, courses, quizzes…) là một module riêng trong cùng một backend. Có sẵn guard phân quyền, kiểm tra dữ liệu đầu vào và Swagger. |
| Ngôn ngữ | **TypeScript** | Cùng ngôn ngữ với frontend (Next.js), có kiểu dữ liệu chặt chẽ và ít lỗi hơn. |
| ORM / Migration | **Prisma** | Định nghĩa schema ở một file duy nhất (`schema.prisma`), tự sinh code truy vấn có kiểu, và quản lý migration theo phiên bản. |
| Cơ sở dữ liệu | **PostgreSQL 16** (Cloud SQL) | Lưu dữ liệu quan hệ: users, courses, enrollments, quizzes, submissions. Đảm bảo ACID khi nộp bài quiz đồng thời. |
| Mã hoá mật khẩu | **argon2id** | Băm mật khẩu người dùng và mật khẩu khoá học (Restricted). Không thể giải ngược. |
| Xác thực | **JWT** access token (15 phút), gửi qua header `Authorization: Bearer` | Không cần lưu phiên trên server, nên Cloud Run tự mở rộng dễ dàng. |
| Phiên đăng nhập | **Refresh token** xoay vòng (7 ngày), lưu dạng băm SHA-256 | Gia hạn đăng nhập. Phát hiện token bị đánh cắp khi token cũ bị dùng lại. |
| Định danh (ID) | **UUID** cho User, **số nguyên** cho các đối tượng khác | URL ngắn gọn, ví dụ `/courses/1234`. API hiển thị kèm tiền tố, ví dụ `crs_1234`. |
| Lưu trữ file | **Cloud Storage** + signed URL | Video, tài liệu và bài nộp đi thẳng từ trình duyệt lên Cloud Storage, API không xử lý file. Database chỉ lưu đường dẫn (key). |
| Phân phối media | **Cloud CDN** | Phát video và tài liệu nhanh từ máy chủ gần người dùng, qua link có hạn (~10 phút). |
| Giới hạn upload | 200 MB (video), 100 MB (file khác) | Đủ cho bản demo (proof of concept), tránh chi phí lưu trữ lớn. |
| Bộ nhớ đệm | **Redis** (Memorystore), từ tuần 5 | Cache danh mục khoá học và đề cương. Giới hạn số request. |
| Xử lý bất đồng bộ | **Pub/Sub** → Cloud Run worker | Gửi thông báo, email và lập chỉ mục tài liệu cho AI mà không làm chậm request. |
| Triển khai | **Cloud Run** (Docker) | Tự động mở rộng theo lượng truy cập, nhất là lúc nhiều sinh viên làm quiz cùng lúc. |
| Bảo mật cấu hình | **Secret Manager** | Lưu khoá JWT và mật khẩu database, không đưa vào code. |
| Tài liệu API | **Swagger** (`/api/docs`) | Frontend (M4) xem và thử API trực tiếp. |
| Kiểm thử | **Jest + Supertest**, **k6** | Unit/e2e test cho API. Load test với 50 / 100 / 500 người dùng đồng thời. |

The first 11 rows and Swagger are built. Redis, Pub/Sub, Cloud Run, Secret Manager and the test tools follow the [root README](../README.md) plan and are not built yet.

> This document **replaces section 8 (Data model)** of the [root README](../README.md) for every M2 table. Where the two differ, follow this file.

---

## 1. Conventions

### IDs

| Entity | Stored in DB as | Shown in API JSON as | Used in URLs as |
|---|---|---|---|
| User | UUID | `"8b9c4d2e-1a3f-4b5c-6d7e-8f9a0b1c2d3e"` | UUID |
| Course | integer | `"crs_1234"` | `1234` |
| Enrollment | integer | `"enr_778899"` | `778899` |
| Module | integer | `"mod_5501"` | `5501` |
| Lesson | integer | `"les_9901"` | `9901` |
| Quiz | integer | `"qz_4401"` | `4401` |
| Question | integer | `"qst_101"` | `101` |
| Quiz attempt | integer | `"att_2001"` | `2001` |
| Assignment | integer | `"asg_3301"` | `3301` |
| Submission | integer | `"sub_6601"` | `6601` |
| Notification | integer | `"ntf_110293"` | `110293` |
| Refresh token | integer | never sent | never used |

- The database stores **numbers only**. The prefix is added when the API sends a response and removed when it reads a request.
- URLs use the bare number: `/courses/7020/files?preview=1565543` or `/courses/{courseId}/{tab}/{preview}`.

### Naming and types

- **All field names are `camelCase`** in the API and in this document (`firstName`, `createdAt`, `videoKey`).
  - The physical database columns are `snake_case` (`first_name`). Prisma maps them automatically, so this only matters when writing raw SQL.
- All timestamps end in `At` and are ISO-8601 UTC, for example `"2026-10-17T16:30:00Z"`.
- Enum values are stored exactly as written in this document (`"Student"`, `"Middle School"`, …).
- In the shapes below, `| null` means the field is optional and can be `null`.

### Media files

The database stores **Cloud Storage object keys**, never URLs. On every request that needs a file, the API generates a short-lived signed URL from the key (see the Lesson and Submission objects). Signed URLs expire, so storing them would break links.

---

## 2. Authentication

Login uses **username (or email) + password**.

- The access token is sent in the **`Authorization: Bearer <token>` header** on every request. Cookies are not used.
- Usernames and emails are stored lowercase, so `Liem.Phan` and `liem.phan` are the same account.

### Registering as a Student or an Instructor

The register form offers both roles, but **every new account starts as a Student**:

| Chosen at sign-up | Account created | What happens next |
|---|---|---|
| `"Student"` (default) | `accountType: "Student"` | Nothing. |
| `"Instructor"` | `accountType: "Student"`, `instructorRequestStatus: "Pending"` | An Admin approves it (`accountType` becomes `"Instructor"`) or rejects it (stays a Student). Until then the account can do everything a Student can, and nothing an Instructor can. |

- Admin approval queue: `GET /admin/users?instructorRequestStatus=Pending`, then `POST /admin/users/{id}/instructor-request/approve` or `/reject`.
- A rejected Student can ask again with `POST /users/me/instructor-request`.
- An Admin can also set any account type directly with `PATCH /admin/users/{id}`, the only route that changes `accountType`. Admins cannot change their own type.
- The new role appears in the next access token. The frontend gets it by calling `POST /auth/refresh`, or the user logs in again.

This matches how school platforms such as Google Classroom handle teacher sign-up: users say they are a teacher, and an admin verifies them.

### Passwords

| Action | Endpoint | Rules |
|---|---|---|
| Change | `PATCH /users/me/password {currentPassword, newPassword}` | `currentPassword` must be right. `newPassword` must follow the policy **and differ from the current password**. Every other login session is logged out; this one stays logged in. |
| Forgot | `POST /auth/forgot-password {email}` | Always answers `202` with the same message, so it does not reveal which emails have accounts. Sends a link `FRONTEND_URL/reset-password?token=…`, valid for 30 minutes (`PASSWORD_RESET_TTL_MINUTES`). Requesting a new link makes older links stop working. |
| Reset | `POST /auth/reset-password {token, newPassword}` | The link works once. `newPassword` must follow the policy and differ from the current password. Every login session is logged out. |

The reset token is stored only as a SHA-256 hash (`PasswordResetToken`). The email goes out through the outbox → worker in production (`MAIL_TRANSPORT=outbox`). In development it is printed to the API log.

There is no account lockout. Login, register, refresh, password change/reset, forgot-password and course enrollment are rate limited to **10 requests per minute** per IP (or per user when logged in). Every other route allows 120 requests per minute. Both limits are set in `.env`.

Password rules (enforced in `password-policy.ts`):

| Rule | Value |
|---|---|
| Length | 8 to 32 characters |
| Uppercase letter | at least 1 |
| Number | at least 1 |
| Special character (not a letter or digit) | at least 1 |

Passwords are stored as an **argon2id hash** in `passwordHash`. A hash cannot be reversed, and it is never returned by the API.

### Tokens

| Token | Lifetime | Stored on server? |
|---|---|---|
| Access token (JWT) | 15 minutes | No. Verified by signature, so any API instance can check it. |
| Refresh token | 7 days | Yes, as a SHA-256 hash in `RefreshToken` (section 3.10). |

**Login response** (`POST /auth/login`)

```jsonc
{
  "accessToken": "eyJhbGciOi…",          // JWT, send as "Authorization: Bearer <token>"
  "refreshToken": "4f9c1e…",             // opaque random string, shown once
  "user": { /* User object, section 3.1 */ }
}
```

**Rotation:** every `POST /auth/refresh` revokes the refresh token it was given and returns a new pair. If an already-revoked token is used again, the server treats it as stolen and revokes every token in that login session (`familyId`). `POST /auth/logout` revokes the current token.

---

## 3. Objects

Each block shows the object as the API sends it. Comments describe each field's type and allowed values.

### 3.1 User

```jsonc
{
  "id": "8b9c4d2e-1a3f-4b5c-6d7e-8f9a0b1c2d3e", // UUID
  "username": "liem.phan",                     // string, unique
  "firstName": "Liem",                         // string
  "lastName": "Phan",                          // string
  "email": "liem@example.com",                 // string, unique
  "accountType": "Student",                    // "Student" | "Instructor" | "Admin", default "Student"
  "description": "Second-year CS student.",    // string (plain text) | null
  "isVerified": false,                         // boolean, default false
  "instructorRequestStatus": null,             // "Pending" | "Approved" | "Rejected" | null (never asked)
  "enrolledCourses": [                         // built from Enrollments (Dropped ones left out); only on login, refresh and /users/me
    {
      "courseId": "crs_1234",
      "status": "Active",                      // enrollment status
      "enrolledAt": "2026-10-17T16:30:00Z",
      "progressPercentage": 0                  // integer 0–100, from M3's progress module (placeholder: 100 if Completed, else 0)
    }
  ],
  "createdAt": "2026-10-17T16:00:00Z",
  "updatedAt": "2026-10-17T16:00:00Z"
}
```

`passwordHash` exists in the database but is never sent.

Course  (e.g. "Data Science Fundamentals", crs_1234)
 └─ Module  (e.g. "Module 1: Setup and Environment", mod_5501)
     └─ Lesson  (e.g. "Installing Anaconda", les_9901)
         └─ Quiz or Assignment (attached to a lesson slot)


### 3.2 Course

```jsonc
{
  "id": "crs_1234",
  "title": "Data Science Fundamentals",        // string (plain text)
  "slug": "data-science-fundamentals",         // string, unique, lowercase-with-hyphens
  "shortSummary": "Learn the basics of data analysis, cleanup, and visualization using Python.", // string | null
  "difficultyLevel": "College",                // "Elementary" | "Middle School" | "High School" | "College"
  "instructorIds": ["8b9c4d2e-1a3f-4b5c-6d7e-8f9a0b1c2d3e"], // user UUIDs, stored in CourseInstructor
  "visibility": "Public",                      // "Public" | "Restricted" | "Draft" | "Archived", default "Draft"
  "requiresPassword": false,                   // boolean, true when visibility is "Restricted"
  "enrollmentOpensAt": "2026-10-01T00:00:00Z", // timestamp | null (null = open from now)
  "enrollmentClosesAt": "2026-12-31T23:59:59Z", // timestamp | null (null = never closes)
  "hasCertificate": true,                      // boolean, default false
  "category": "Data Science",                  // string (max 50) | null; label for course cards
  "thumbnailUrl": "/images/courses/python_data_course.png", // https URL or frontend path | null; public, not signed
  "instructors": [{ "id": "8b9c…", "firstName": "Hà", "lastName": "Phạm Thu" }], // names for display
  "stats": { "lessonCount": 8, "totalDurationMinutes": 205, "studentCount": 12 }, // computed per request
  "prerequisiteCourseIds": ["crs_1010"],       // stored in CoursePrerequisite; must be completed before enrolling
  "createdAt": "2026-03-15T08:00:00Z",
  "updatedAt": "2026-10-17T16:15:00Z"
}
```

`visibility` is the only publish state:

| Value | In the catalog? | Can new students enroll? | Enrolled students |
|---|---|---|---|
| `Draft` | No. Only its instructors and Admins see it. | No | n/a (not published yet) |
| `Public` | Yes | Yes, within the enrollment window | Full access |
| `Restricted` | Yes, marked as password-protected | Yes, within the enrollment window, **after entering the course password** | Full access (the password is asked only once, at enrollment) |
| `Archived` | No | No | Keep read-only access to content and their results |

- **Course password:** the instructor sets it, and it is stored as an argon2id hash (`accessPasswordHash`), never in plain text. It is never sent; the API only sends `requiresPassword`.
- **Enrollment window:** a student can enroll only between `enrollmentOpensAt` and `enrollmentClosesAt`.
- **Prerequisites are enforced.** A student can enroll only after finishing every course in `prerequisiteCourseIds`, meaning they have an Enrollment with `status: "Completed"` in each one.
  - An ordered series is a chain: Course 2 lists Course 1, Course 3 lists Course 2, and so on up to Course 10.
  - The API rejects a course listing itself, and loops (1 requires 2 requires 1).
- **Deleting a course** sets it to `Archived` (soft delete), so student results are kept.

**Who can manage a course**

| Action | Instructor | Admin |
|---|---|---|
| Edit, publish, archive the course and its modules, lessons, quizzes and assignments | Only courses in their own `instructorIds` | Any course |
| Grade submissions | Only their own courses | Any course |
| Suspend or un-suspend an enrollment | Only their own courses | Any course |

- Every instructor listed in `instructorIds` has these full rights, whether or not they created the course.
- The instructor who creates a course is added to its `instructorIds` automatically.

### 3.3 Enrollment

```jsonc
{
  "id": "enr_778899",
  "userId": "8b9c4d2e-1a3f-4b5c-6d7e-8f9a0b1c2d3e", // User UUID
  "courseId": "crs_1234",
  "status": "Active",                    // "Active" | "Completed" | "Suspended" | "Dropped", default "Active"
  "timesEnrolled": 1,                    // integer, default 1; +1 each time a Dropped enrollment is re-activated
  "completedAt": null,                   // timestamp | null, set when M3 reports progress reached 100%
  "enrolledAt": "2026-10-17T16:30:00Z"
}
```

What each status allows:

| Status | Content | Quizzes / assignments | Own results | Can drop? |
|---|---|---|---|---|
| `Active` | Yes | Yes | Yes | Yes |
| `Completed` | Read-only | **No** (no new attempts or submissions) | Yes | No |
| `Suspended` | No | No | No | No |
| `Dropped` | No | No | No | n/a (can re-enroll) |

- Each student has **one enrollment row per course**: `(userId, courseId)` is unique. Re-enrolling after dropping re-activates that row and increases `timesEnrolled`.
- **Suspending:** an Instructor of the course or an Admin can set `status` to `"Suspended"` only when `timesEnrolled` is 2 or more **and** `completedAt` is `null` (enrolled at least twice, never finished).
  - Suspension applies to **students only**. A suspended student cannot open content, take quizzes, submit assignments or re-enroll in that course.
  - An Instructor of the course or an Admin can lift it by setting `status` back to `"Active"`.
- Progress percentage is **not** stored here. M3's progress module owns it.

### 3.4 Module

```jsonc
{
  "id": "mod_5501",
  "courseId": "crs_1234",
  "title": "Module 1: Setup and Environment", // string
  "sortOrder": 1                              // integer, sets the order in the sidebar
}
```

### 3.5 Lesson

```jsonc
{
  "id": "les_9901",
  "moduleId": "mod_5501",
  "courseId": "crs_1234",               // copied from the module for direct indexing; must match it
  "title": "Installing Anaconda and Jupyter Notebooks",
  "slug": "installing-anaconda-and-jupyter", // unique within the course
  "type": "Video",                      // "Video" | "Text" | "Document" | "Quiz" | "Assignment"
  "sortOrder": 1,                       // integer, order within the module
  "estimatedDurationMinutes": 12,       // integer | null
  "isPreview": false,                   // boolean, default false; true = free preview, see below
  "textContent": null,                  // string | null, used when type is "Text"
  "videoUrl": "https://cdn.eduline.example/media/…?Signature=…", // signed URL generated per request | null
  "downloadableResources": [            // signed URLs generated per request
    "https://cdn.eduline.example/media/…?Signature=…"
  ]
}
```

What the database stores instead of the URLs:

| Stored field | Example | Becomes in the API |
|---|---|---|
| `videoKey` | `"courses/1234/lessons/9901/video.mp4"` | `videoUrl` (signed, about 10 minutes) |
| `resourceKeys` | `["courses/1234/lessons/9901/setup.pdf"]` | `downloadableResources` (signed) |

Lessons of type `"Quiz"` or `"Assignment"` are the slots that a Quiz or Assignment attaches to through `lessonId`.

- **Preview lessons:** a lesson with `isPreview: true` can be opened by anyone who can see a published course, without enrolling (like Udemy's free previews). Students suspended from the course still cannot open it.
- **Interrupted uploads:** `videoKey` / `resourceKeys` are written only by `POST /lessons/{id}/content/complete`, after the API has checked that the uploaded file exists in Cloud Storage and has the right size and type. If the connection drops mid-upload, `/complete` is never called, so the lesson simply has no video and the instructor uploads again. There is no "pending upload" table.

### 3.6 Quiz, Question, Quiz attempt

Questions and attempts are separate tables, not JSON inside the quiz. This lets M3 score each answer and handle many students submitting at once.

**Quiz (instructor view)**

```jsonc
{
  "id": "qz_4401",
  "lessonId": "les_9902",               // the Lesson slot this quiz fills
  "courseId": "crs_1234",
  "title": "Variables and Syntax Check",
  "passingScorePercentage": 80,         // integer 0–100, default 80
  "timeLimitMinutes": null,             // integer | null (null = untimed)
  "maxAttempts": null,                  // integer | null (null = unlimited)
  "questions": [
    {
      "questionId": "qst_101",
      "questionText": "Which of the following is a valid integer declaration in Python?",
      "options": ["x = 5", "int x = 5;", "let x = 5"], // array of strings
      "correctOptionIndex": 0,          // integer, 0-based index into options
      "points": 10,                     // integer, default 10
      "sortOrder": 1
    }
  ]
}
```

**Quiz (student view):** the same object, but every question omits `correctOptionIndex`. The server compares answers against it when the attempt is submitted.

**Quiz attempt**

```jsonc
{
  "id": "att_2001",
  "quizId": "qz_4401",
  "userId": "8b9c4d2e-1a3f-4b5c-6d7e-8f9a0b1c2d3e",
  "status": "Submitted",                // "InProgress" | "Submitted"
  "answers": [
    {
      "questionId": "qst_101",
      "selectedOptionIndex": 0,         // integer | null (not answered)
      "pointsAwarded": 10               // integer | null until scored (written by M3)
    }
  ],
  "score": 10,                          // integer | null until scored (written by M3)
  "maxScore": 10,                       // integer | null until scored
  "passed": true,                       // boolean | null; score / maxScore ≥ passingScorePercentage
  "startedAt": "2026-10-17T16:40:00Z",
  "expiresAt": null,                    // timestamp | null; startedAt + timeLimitMinutes when the quiz is timed
  "submittedAt": "2026-10-17T16:48:00Z" // timestamp | null
}
```

- Each attempt can hold only one answer per question: `(attemptId, questionId)` is unique.
- M2 creates attempts and saves answers. M3's scoring module fills in `pointsAwarded`, `score`, `maxScore` and `passed`.

### 3.7 Assignment

```jsonc
{
  "id": "asg_3301",
  "lessonId": "les_9905",               // the Lesson slot this assignment fills
  "courseId": "crs_1234",
  "title": "Your First Script Submission",
  "instructions": "Write a script that parses a CSV file and return your .py file.", // string
  "maxPoints": 100,                     // integer, default 100
  "allowedExtensions": [".py", ".txt"], // array of strings
  "dueAt": "2026-10-24T23:59:59Z"       // timestamp | null
}
```

### 3.8 Submission

```jsonc
{
  "id": "sub_6601",
  "assignmentId": "asg_3301",
  "userId": "8b9c4d2e-1a3f-4b5c-6d7e-8f9a0b1c2d3e", // the student who submitted
  "fileName": "parse_csv.py",           // original file name, string
  "sizeBytes": 2048,                    // integer
  "mimeType": "text/x-python",          // string
  "status": "Graded",                   // "Submitted" | "Graded", default "Submitted"
  "isLate": false,                      // boolean; true when submittedAt is after the assignment's dueAt
  "score": 90,                          // integer 0–maxPoints | null until graded
  "feedback": "Clean parsing. Handle empty rows next time.", // string | null
  "gradedById": "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",      // instructor UUID | null
  "submittedAt": "2026-10-20T10:00:00Z",
  "gradedAt": "2026-10-21T09:00:00Z"    // timestamp | null
}
```

- Each student has **one submission per assignment**: `(assignmentId, userId)` is unique.
- Files can be at most **100 MB**, and the extension must be in the assignment's `allowedExtensions`.
- **Late work is accepted.** If `submittedAt` is after `dueAt`, `isLate` is set to `true`.
- **Resubmitting** replaces the file in the same submission. It is allowed only while **both** are true:
  - the assignment's `dueAt` has not passed, and
  - the submission has not been graded (`status` is still `"Submitted"`).

  A student who missed the deadline can still submit once (flagged late), but cannot replace that file.
- The file goes straight from the browser to the private Cloud Storage `submissions` bucket. The database stores only `fileKey` (for example `"submissions/3301/8b9c4d2e…/parse_csv.py"`), which is never sent.
- To download, the student or instructor calls `GET /submissions/{id}/download-url` and gets a short-lived signed URL.
- Grading sets `status`, `score`, `feedback`, `gradedById` and `gradedAt`, then publishes an `ASSIGNMENT_GRADED` event. The worker turns that event into a Notification.

### 3.9 Notification

```jsonc
{
  "id": "ntf_110293",
  "recipientId": "8b9c4d2e-1a3f-4b5c-6d7e-8f9a0b1c2d3e", // target User UUID
  "type": "AssignmentGraded",           // "AssignmentGraded" | "CourseAnnouncement" | "System"
  "title": "Assignment Graded!",
  "messageBody": "Your script submission scored 90/100 points.",
  "actionUrl": "/courses/1234/lessons/9905", // in-app route | null
  "isRead": false,                      // boolean, default false
  "createdAt": "2026-10-17T16:32:00Z"
}
```

The worker creates notifications. The API only lists them and marks them as read.

The database also stores `sourceEventId` (never sent): the `eventId` of the Pub/Sub event that created the notification. It is unique, so a redelivered event cannot create a second notification.

### 3.10 Refresh token (server-side only)

Never returned by the API. It is shown here so the team knows what the server stores for each login session.

```jsonc
{
  "id": 501,                            // integer
  "userId": "8b9c4d2e-1a3f-4b5c-6d7e-8f9a0b1c2d3e",
  "tokenHash": "9f86d081884c7d65…",     // SHA-256 of the raw token, unique
  "familyId": "c0ffee00-1111-4222-8333-444455556666", // UUID shared by every token from one login
  "expiresAt": "2026-10-24T16:00:00Z",  // 7 days after issue
  "revokedAt": null,                    // timestamp | null; set on refresh, logout or theft detection
  "createdAt": "2026-10-17T16:00:00Z"
}
```

---

## 4. Relationships

```
User ─< Enrollment >─ Course
User ─< CourseInstructor >─ Course          (instructorIds)
Course ─< CoursePrerequisite >─ Course      (prerequisiteCourseIds)
Course ─< Module ─< Lesson
Lesson ─< Quiz ─< Question
Quiz ─< QuizAttempt ─< AttemptAnswer >─ Question
User ─< QuizAttempt
Lesson ─< Assignment ─< Submission >─ User  (student; gradedById is a second link to the instructor)
User ─< RefreshToken
User ─< PasswordResetToken
User ─< Notification
OutboxEvent                                 (no relations; events waiting to be published)
```

- `A ─< B` means one A has many B.
- Deleting a parent also deletes its children. The exception is a Submission's `gradedById`: if the instructor is deleted, it is set to `null` and the grade stays.

---

## 5. Changes as of 17/10/2026

This is the first version of the backend data model. It starts from the M2 object specification and applies these decisions:

| # | Change | Reason |
|---|---|---|
| 1 | Course `isPublished` **removed**. `visibility` (`Public` / `Restricted` / `Draft` / `Archived`) is the only publish state. | The two fields could contradict each other (published but Draft). |
| 2 | All timestamps renamed to `*At`. User `createdOn`/`updatedOn` became `createdAt`/`updatedAt`. Assignment `dueDate` became `dueAt`. | One naming rule everywhere. |
| 3 | Quiz `questions` moved from embedded JSON into **Question**, **QuizAttempt** and **AttemptAnswer** tables. | Per-answer scoring by M3, and safe concurrent submits during the load test. |
| 4 | Lesson `videoUrl` / `downloadableResources` are stored as **`videoKey`** / **`resourceKeys`**. The API signs them into URLs on each request. | Signed CDN URLs expire. Keys never do. |
| 5 | Lesson `type` gained **`Quiz`** and **`Assignment`**. | Quizzes and assignments attach to a lesson slot. |
| 6 | Enrollment `progressPercentage` **removed**. M3 owns progress, and the API asks M3 for it when building `enrolledCourses`. | One owner for progress data. |
| 7 | Password length capped at **32 characters** (8–32). | Limits hashing cost from very long inputs. |
| 8 | Arrays of IDs became link tables: `instructorIds` → **CourseInstructor**, `prerequisiteCourseIds` → **CoursePrerequisite**. User `enrolledCourses` is built from Enrollment. | The database can then guarantee every referenced ID exists. |
| 9 | IDs: users use UUIDs. Everything else is a plain integer in the database, shown with a prefix (`crs_`, `les_`, …) in the API. | Matches "only numbers for now" and the numeric URL style. |
| 10 | Added unique rules and indexes: unique username, email, course slug, slug per course, one enrollment per user per course, one answer per question per attempt, one submission per student per assignment. Indexes on sort orders, foreign keys and unread notifications. | Data integrity and fast common queries. |
| 11 | **Submission** object added: file stored as a key in Cloud Storage, plus grade, feedback, grader and late flag. | Needed for assignment upload and grading (Week 6). |
| 12 | **RefreshToken** object added: hashed, rotating 7-day tokens grouped by login session (`familyId`). | Needed for login and logout (Week 3). Stolen-token reuse is detectable. |
| 13 | All field names in the API and this document are **camelCase**. | Matches the root README's API conventions and the TypeScript code. |
| 14 | Backend framework fixed as **NestJS**. | Team decision. |
| 15 | Course `visibility` gained **`Archived`**. Deleting a course archives it. | Keeps student results when a course is retired. |
| 16 | Course gained **`accessPasswordHash`** (Restricted courses need a password to enroll) and an **enrollment window** (`enrollmentOpensAt`, `enrollmentClosesAt`). | Restricted means password-protected; students enroll only within the course's dates. |
| 17 | Enrollment gained **`timesEnrolled`**. Suspending is allowed only when `timesEnrolled ≥ 2` and the course was never completed. | Implements the suspension rule. |
| 18 | Quiz gained **`timeLimitMinutes`** and **`maxAttempts`** (both optional). QuizAttempt gained **`expiresAt`**. | Values exist now; the rules come later. |
| 19 | Upload limit set to **100 MB** for all files. Late submissions are accepted and flagged. | Team decision. |
| 20 | Access token travels in the `Authorization` header. New accounts are Students; only Admins promote to Instructor. | Team decision. |
| 21 | ORM fixed as **Prisma**. | Team decision. |
| 22 | **Prerequisites are enforced** at enrollment: every prerequisite course must be Completed. Ordered series are chains of prerequisites. | Courses in a series must be taken in order. |
| 23 | Suspension affects students only and can be lifted by an Instructor of the course or an Admin. | Team decision. |
| 24 | Instructors manage, grade and suspend **only in courses they are listed on**. Admins can act on any course. | Team decision. |
| 25 | **Resubmission** allowed until `dueAt` passes or the submission is graded, whichever comes first. | Team decision. |
| 26 | Lesson video limit raised to **200 MB**. Other files stay at 100 MB. | Enough for a proof of concept. |

### Changes as of 02/11/2026

| # | Change | Reason |
|---|---|---|
| 27 | Register accepts `accountType: "Student" \| "Instructor"`. Instructor sign-ups are created as Students with **`instructorRequestStatus: "Pending"`** (+ `instructorRequestedAt`); an Admin approves or rejects. | Team decision (integration-review #4). Keeps the account safe until verified. |
| 28 | **Forgot / reset password** added: `PasswordResetToken` table (SHA-256 hash, 30 min, single use). Reset logs out every session. | Team decision. |
| 29 | **Password change** must follow the policy and differ from the current password. Logs out other sessions. | Team decision. |
| 30 | Lesson gained **`isPreview`** (free preview lessons). | Team decision (integration-review #7). |
| 31 | Media keys are written only at `/content/complete`, after the upload is verified. No `ContentAsset` table. | Team decision (integration-review #8, option B). |
| 32 | **Completed** enrollments are read-only: content and own results, no new quiz attempts or submissions. | Team decision (integration-review #18). |
| 33 | **`OutboxEvent`** table and `Notification.sourceEventId` (unique) added. | ADR-005: no lost or duplicated events (integration-review #11, #12). |
| 34 | Partial unique index: at most one `InProgress` attempt per student per quiz (raw SQL in the init migration). | quiz-submission-design.md (integration-review #13). |
| 35 | API port is **8000**. Usernames and emails are stored lowercase. | Matches the frontend config (integration-review #5). |
| 36 | Rate limits: 10/min on auth and enrollment routes, 120/min elsewhere, counted per user (per IP when anonymous). No account lockout. | Team decision. |
| 37 | Course detail (`GET /courses/{id}`) includes the outline (modules → lessons, titles only). Courses can have co-instructors added/removed by their staff; the last instructor cannot be removed. | Needed by the course page and by Admin-created courses. |
| 38 | Course gained **`category`** and **`thumbnailUrl`** (public cover image). Responses add `instructors` (names) and computed `stats`. `GET /courses/{id}` adds `prerequisites` (titles) and `viewer` (`isStaff`, the caller's `enrollment`). | Course cards and the enroll button on the frontend. |
| 39 | Minimal **content endpoints**: create/delete modules and lessons (no edit, reorder or upload yet). `npm run seed:demo` loads demo courses. | An instructor can build and publish a course end to end. |
| 40 | **Login accepts a username or an email** in the `username` field (usernames cannot contain `@`). | The login form asks for either. |
| 41 | The first Admin is created by **`npm run seed`** (`SEED_ADMIN_*` in `.env`). Admin approval queue: `GET /admin/users?instructorRequestStatus=Pending` + `POST /admin/users/{id}/instructor-request/approve\|reject`. A rejected Student can ask again with `POST /users/me/instructor-request`. | Only an Admin can promote accounts, so one must exist from the start. |
| 42 | Admins cannot change their own `accountType`. A role change reaches the access token at the next `POST /auth/refresh` (up to 15 minutes later). | Avoids locking out the last Admin; the role travels in the JWT. |
| 43 | User object gained **`instructorRequestStatus`**. `enrolledCourses` items gained `status` and leave out Dropped enrollments. | The frontend shows the approval state and the enrollment state. |
| 44 | IDs in URLs and request bodies accept both forms: `crs_1234` or `1234`. Responses always use the prefixed form. | Frontend can pass back the ids it received. |
| 45 | Course rules: **publish** needs ≥ 1 lesson, and Restricted also needs a course password (which cannot be removed while Restricted). **Drop** is allowed only from Active. **Suspend** is allowed from Active or Dropped (with `timesEnrolled ≥ 2`, never completed). | Prevents empty courses, and dropping as a way around a suspension. |
| 46 | Events written to the outbox: `ENROLLMENT_CREATED`, `COURSE_PUBLISHED`, `INSTRUCTOR_REQUEST_DECIDED`, `EMAIL_REQUESTED` (password reset). Published to Pub/Sub once the relay exists (week 7). | ADR-005. |

### Changes by M3 as of 06/11/2026

Full design, test cases and eval results: [docs/m3-plan.md](docs/m3-plan.md).

| # | Change | Reason |
|---|---|---|
| 47 | **`LessonProgress`** table added (`lesson_progress`, migration `20261106000000_lesson_progress`): one row per student per lesson, with `lastPositionSeconds`, `percent` (0–100), `completedAt`, and `courseId` copied from the lesson. Key `(userId, lessonId)`; indexes `(courseId, userId)` and `(courseId, updatedAt)`. | M3 owns progress; course progress is one query on `(courseId, userId)`. |
| 48 | The old ERD's **`progress_events`** table is **not** built. `LessonProgress.updatedAt` serves as "last activity". | Enough for the "active in the last 7 days" metric, with one write per heartbeat. |
| 49 | **Lesson completion rules:** Video at **≥ 90 %** watched; Text and Document when the student clicks "complete"; Quiz when an attempt has `passed = true`; Assignment when a file is submitted. The last two are triggered by M2 through `ProgressService.markLessonCompleted(ref, tx?)`. | One clear rule per lesson type. |
| 50 | Video `percent` **never decreases**; the resume point (`lastPositionSeconds`) follows the latest heartbeat, even when rewinding. `completedAt` is set **once**. A position up to 5 s past the video's end is accepted. | Rewinding must not undo progress; video players overshoot slightly. |
| 51 | **Course progress** = `floor(completed lessons × 100 / total lessons)`, so it reads 100 only when every lesson is done. At 100 % M3 calls `EnrollmentsService.markCompleted`, which gained an optional transaction parameter (`tx`). | The enrollment becomes `Completed` (unlocking prerequisite chains), also from inside M2's quiz submit transaction. |
| 52 | Only a student with an **Active** enrollment records progress. A `Completed` enrollment can still read its progress but not change it. New error codes: `LESSON_TYPE_NOT_SUPPORTED` (422), `PROGRESS_NOT_ALLOWED` (403), `LESSON_NOT_FOUND` (404), `INVALID_PROGRESS` (400). | Matches change 32 (Completed is read-only). A 404 does not reveal whether a lesson exists. |
| 53 | **Real `progressPercentage`** in `GET /me/courses` and `enrolledCourses`, from `CourseProgressService.getCourseProgressMap(userId, courseIds)` (two queries for all courses). Replaces the placeholder in `user.mapper.ts`. A Completed enrollment always reads 100. | Closes job 5. Kept apart from `ProgressService` to avoid a circular dependency with `EnrollmentsService`. |
| 54 | **Progress endpoints:** `PUT /lessons/{id}/progress` (video heartbeat about every 15 s, `{positionSeconds, durationSeconds}`), `POST /lessons/{id}/complete`, `GET /lessons/{id}/progress`, `GET /courses/{id}/progress/me` (`{courseId, progressPercentage, completedLessonIds, resumeLessonId}`). | Week 5 demo: close the browser, log in again, resume where you left off. |
| 55 | **`ScoringService`**: pure `score(questions, answers)` with no database access. A right answer earns the question's points, wrong or blank earns 0, `maxScore` counts every question, and answers to questions outside the quiz are ignored. `isPassed(score, maxScore, passingScorePercentage)` uses whole numbers only. | quiz-submission-design.md §3: M2 owns the submit transaction; M3 owns the scoring rule. Not called yet (needs M2's quiz API). |
| 56 | **Instructor analytics:** `GET /instructor/courses/{id}/analytics` (enrollments by status, average progress, completion rate, active students in 7 days, per-quiz attempts/average/pass rate, per-assignment submitted/graded/late) and `GET /instructor/courses/{id}/analytics/students` (paged, max 100). Course staff only, never cached. Percentages are whole numbers, or `null` when there is nothing to measure. | Week 7 instructor dashboard. Per-course personal data is not cached (ADR-006). |
| 57 | **Jest + Supertest** set up: `npm test` (unit, no database) and `npm run test:int` (integration, refuses to run unless the database name ends in `_test`, because it empties every table). 16 unit and 35 integration tests. | Shared test setup for M2 and M3. |
| 58 | **Evals and seed:** `npm run eval:scoring` (VMLU questions in `data/`), `eval:progress` (200 replayed heartbeat sequences), `eval:analytics` (every dashboard number vs hand-written SQL). `npm run seed:m3` creates a course with video, ViSQuAD reading lessons and 3 VMLU quizzes (`m3.student` / `m3.instructor`, password `Student#2026`). All three evals passed on 06/11/2026. | Checks the numbers on real data, not only hand-written cases. |
| 59 | Changes to M2 files: back-relations on `User`, `Course` and `Lesson`; `ProgressModule` and `AnalyticsModule` registered in `app.module.ts`; `tsconfig.json` also type-checks `test/` and `scripts/` (`nest build` still builds only `src/`). | Needed to wire M3's modules in. Needs M2 review before merge. |

### Changes as of 08/11/2026

| # | Change | Reason |
|---|---|---|
| 60 | **Who records progress (confirmed):** only a Student with an **Active** enrollment in a course that is currently published (Public or Restricted). Preview viewers, course staff, Completed enrollments and Archived courses can open lessons but their progress is not saved (`403 PROGRESS_NOT_ALLOWED`). The enrollment window only controls enrolling, not studying. | Team decision. Matches change 32 and M3's code; docs/m3-plan.md §4.2 corrected. |
| 61 | **Lesson viewer:** `GET /lessons/{id}` returns the lesson with `textContent`, `videoUrl` and `downloadableResources`. 404 `LESSON_NOT_FOUND` when the course is hidden from the caller, 403 `LESSON_LOCKED` (and no URLs) when the course is visible but the caller may not open the lesson. Public route, so preview lessons open without logging in. | Week 4: students open lessons; the frontend lesson page records progress through M3's endpoints. |
| 62 | **`DEV_SAMPLE_VIDEO_URL`:** until the media service signs real uploads, a Video lesson without a file plays this public sample (outside production only, `isSampleVideo: true`). Nothing is stored as a URL. | Progress can be tested end to end before uploads exist. |
| 63 | **Deleting a lesson or module** deletes students' progress on it (ON DELETE CASCADE) and, in the same transaction, re-checks the course: Active students who have now finished every remaining lesson become **Completed** (`ProgressService.recheckCourseCompletion`, `EnrollmentsService.markCompletedMany`). A course left with no lessons completes nobody. Adding lessons never un-completes anyone. | Same approach as Coursera, Khan Academy and Moodle: progress is measured against the course as it is now, and a finished course stays finished. |

---

## 6. Jobs for later

These are agreed to be done later. The fields already exist, so no schema change will be needed to start them.

| # | Job | What exists now |
|---|---|---|
| 1 | **Email verification.** Design the flow (email link + token), and decide what an unverified user cannot do. | `User.isVerified` (always `false` for now). Nothing is blocked. |
| 2 | **Quiz time limit and attempt limit rules.** Decide defaults and how the API enforces them (reject answers after `expiresAt`, reject a new attempt past `maxAttempts`). | `Quiz.timeLimitMinutes`, `Quiz.maxAttempts`, `QuizAttempt.expiresAt`, all optional. Quizzes are untimed and unlimited. |
| 3 | **Outbox relay** (week 7): publish unpublished `OutboxEvent` rows to Pub/Sub and set `publishedAt`. | Events are already written for `ENROLLMENT_CREATED`, `COURSE_PUBLISHED`, `INSTRUCTOR_REQUEST_DECIDED`, `EMAIL_REQUESTED`. |
| 4 | **Password reset email template** in the worker (M6) for `EMAIL_REQUESTED` with `template: "password-reset"`. | API side done; set `MAIL_TRANSPORT=outbox` once the worker sends it. |
| 5 | **RBAC tests** T01–T31 for M2's endpoints. | Jest + Supertest are set up (change 57), with M3's progress, scoring and analytics tests. No M2 tests yet. |

---

## 7. Not yet decided

Nothing is open as of 02/11/2026. New questions go here.

---

## 8. Endpoints built (week 3)

Base path `/api/v1`. Full request/response shapes are in Swagger (`/api/docs`). Ids in URLs can be `1234` or `crs_1234`.

| Method and path | Who | Notes |
|---|---|---|
| `GET /health` | anyone | Reads the database |
| `POST /auth/register` | anyone | `{username, firstName, lastName, email, password, accountType?}` → same as login, `201` |
| `POST /auth/login` | anyone | `{username, password}`; `username` may also be the email → `{accessToken, refreshToken, user}` |
| `POST /auth/refresh` | refresh token | `{refreshToken}` → new pair + user |
| `POST /auth/logout` | refresh token | `{refreshToken}` → `204`, ends that login session |
| `POST /auth/forgot-password` | anyone | `{email}` → `202` |
| `POST /auth/reset-password` | reset link | `{token, newPassword}` → `204` |
| `GET /users/me` | logged in | User + `enrolledCourses` |
| `PATCH /users/me` | logged in | `{firstName?, lastName?, description?}` |
| `PATCH /users/me/password` | logged in | `{currentPassword, newPassword}` → `204` |
| `POST /users/me/instructor-request` | Student | Ask to become an Instructor |
| `GET /admin/users` | Admin | `?accountType=&instructorRequestStatus=&q=&page=&pageSize=` |
| `GET /admin/users/{id}` | Admin | |
| `PATCH /admin/users/{id}` | Admin | `{accountType}` |
| `POST /admin/users/{id}/instructor-request/approve` · `/reject` | Admin | |
| `GET /courses` | anyone | Catalog: Public + Restricted. `?q=&difficultyLevel=&sort=newest\|title&page=&pageSize=` |
| `GET /courses/{id or slug}` | anyone who can see it | Course + `modules[].lessons[]` outline |
| `POST /courses` | Instructor, Admin | Created as Draft; creator becomes an instructor |
| `PATCH /courses/{id}` | course staff | Any field except visibility; `coursePassword: null` removes it |
| `POST /courses/{id}/publish` | course staff | `{visibility: "Public" \| "Restricted"}`; needs ≥ 1 lesson; Restricted needs a password |
| `DELETE /courses/{id}` | course staff | Archives |
| `POST /courses/{id}/instructors` · `DELETE /courses/{id}/instructors/{userId}` | course staff | Co-instructors |
| `GET /instructor/courses` | Instructor, Admin | Courses they teach, any visibility |
| `POST /courses/{id}/enroll` | Student | `{coursePassword?}` |
| `DELETE /courses/{id}/enroll` | Student | Active → Dropped, `204` |
| `GET /me/courses` | logged in | `[{enrollment, course, progressPercentage}]` |
| `GET /courses/{id}/students` | course staff | `?status=`; `[{enrollment, student}]` |
| `PATCH /enrollments/{id}` | course staff | `{status: "Suspended" \| "Active"}` |
| `POST /courses/{id}/modules` | course staff | `{title}`; added at the end |
| `DELETE /modules/{id}` | course staff | Deletes its lessons too |
| `POST /modules/{id}/lessons` | course staff | `{title, type: "Text" \| "Video" \| "Document", textContent?, estimatedDurationMinutes?, isPreview?}` |
| `DELETE /lessons/{id}` | course staff | |
| `GET /lessons/{id}` | enrolled (Active/Completed), course staff, or anyone for a preview lesson | Lesson viewer: `textContent`, `videoUrl` (signed; dev sample until uploads exist), `downloadableResources` |
| `PUT /lessons/{id}/progress` | Student, Active enrollment | M3. Video heartbeat `{positionSeconds, durationSeconds}` → `{lessonId, lastPositionSeconds, percent, completedAt}` |
| `POST /lessons/{id}/complete` | Student, Active enrollment | M3. Text and Document lessons only |
| `GET /lessons/{id}/progress` | anyone who can open the lesson | M3. Zeros if never opened |
| `GET /courses/{id}/progress/me` | anyone who can view the course content | M3. `{courseId, progressPercentage, completedLessonIds, resumeLessonId}` |
| `GET /instructor/courses/{id}/analytics` | course staff | M3. Dashboard numbers: see [docs/m3-plan.md](docs/m3-plan.md) §4.5 |
| `GET /instructor/courses/{id}/analytics/students` | course staff | M3. `?status=&page=&pageSize=` |

"Course staff" = an Instructor listed on the course, or any Admin. Every error has the shape `{ "error": { "code", "message", "details", "requestId" } }`; the `code` values are stable and meant for the frontend to switch on (e.g. `ALREADY_ENROLLED`, `PREREQUISITES_NOT_MET`, `INVALID_COURSE_PASSWORD`).
