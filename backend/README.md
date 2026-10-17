# EduLine Backend: M2 Data Model

This folder holds the backend's data model for the M2 modules: auth, users, courses, enrollments, content (modules and lessons), quizzes, assignments, submissions and notifications.

| File | What it is |
|---|---|
| [prisma/schema.prisma](prisma/schema.prisma) | Database schema (PostgreSQL, Prisma). Source of truth for tables, fields, relations and indexes. |
| [src/modules/auth/password-policy.ts](src/modules/auth/password-policy.ts) | Password rules used by registration and password change. |
| [src/common/config/upload-limits.ts](src/common/config/upload-limits.ts) | Maximum upload sizes: 200 MB for lesson videos, 100 MB for every other file. |

The backend framework is **NestJS** (TypeScript) with **Prisma** for the database.

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

Login uses **username + password**.

- Everyone who registers gets `accountType: "Student"`. Only an **Admin** can promote an account to `"Instructor"` (or `"Admin"`) through `PATCH /admin/users/{id}`.
- The access token is sent in the **`Authorization: Bearer <token>` header** on every request. Cookies are not used.

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
  "enrolledCourses": [                         // built from Enrollments, not stored on the user
    {
      "courseId": "crs_1234",
      "enrolledAt": "2026-10-17T16:30:00Z",
      "progressPercentage": 0                  // integer 0–100, supplied by M3's progress module
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
User ─< Notification
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

---

## 6. Jobs for later

These are agreed to be done later. The fields already exist, so no schema change will be needed to start them.

| # | Job | What exists now |
|---|---|---|
| 1 | **Email verification.** Design the flow (email link + token), and decide what an unverified user cannot do. | `User.isVerified` (always `false` for now). Nothing is blocked. |
| 2 | **Quiz time limit and attempt limit rules.** Decide defaults and how the API enforces them (reject answers after `expiresAt`, reject a new attempt past `maxAttempts`). | `Quiz.timeLimitMinutes`, `Quiz.maxAttempts`, `QuizAttempt.expiresAt`, all optional. Quizzes are untimed and unlimited. |

---

## 7. Not yet decided

Nothing is open as of 17/10/2026. New questions go here.
