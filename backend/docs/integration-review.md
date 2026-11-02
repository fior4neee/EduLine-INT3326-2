# Integration Review (M1)

Snapshot: 2026-10-21, updated 2026-11-02 (M2 week 3 backend), branch `main` (`9ef50c5e`) + PR #2.
Source of truth order: `backend/prisma/schema.prisma` → `backend/README.md` → root `README.md` → Google Doc.

Each item is a mismatch between two parts of the repo, or a gap that will block a later week. Owner fixes it; M1 checks it off.

## Open items

| # | Area | Found | Impact | Proposed fix | Owner | Needed by |
|---|---|---|---|---|---|---|
| 1 | Frontend | Root README §5/§6 says **Next.js SSR on Cloud Run "web"**; code is **React + Vite** SPA | Architecture diagram and deploy plan are wrong | Keep Vite, serve the build from a GCS bucket behind the LB + CDN (see [ADR-007](architecture-decisions.md#adr-007-frontend-as-a-static-spa-on-cloud-storage--cdn)) | M1, M4 | Week 3 |
| 9 | Media | Example key `courses/1234/lessons/9901/video.mp4` is **reused when a video is replaced** | Cloud CDN keeps serving the old cached video | Add a random part: `courses/{courseId}/lessons/{lessonId}/{uuid}.mp4` (see [storage-cdn-iam.md](storage-cdn-iam.md)) | M6 | Week 4 |
| 10 | Media | CDN signed URL TTL "~10 minutes" | HTML5 video makes new range requests during playback; after 10 min the URL is expired and seeking/buffering fails | Video URLs: TTL ≥ 2 h. Documents: 10 min is fine (see storage doc) | M6 | Week 4 |
| 14 | Progress | `lesson_progress`, `progress_events` (M3) and `document_chunks` (M6) are not in `schema.prisma` yet | `Enrollment.completedAt` and AI tutor have nowhere to read from | M3/M6 add their models to the same schema (one migration history) | M3, M6 | Week 5 / 8 |
| 15 | DB | `CREATE EXTENSION vector` was run by hand in local Docker only | Cloud SQL and teammates' DBs will not have it | Prisma `previewFeatures = ["postgresqlExtensions"]` + `extensions = [vector]`, or an SQL migration | M2, M6 | Week 8 |
| 16 | Local dev | Root README §6 lists docker-compose with api, web, worker, postgres, redis, fake-gcs, Pub/Sub emulator; `infrastructure/docker-compose.yml` has **postgres only** | Expected, not a bug | Add services as each one starts to exist (api in week 3, redis week 5, emulator week 7) | M1, M5 | Rolling |
| 17 | Git | `develop` exists; PR #1 was merged straight into `main` | Two integration branches drift | All PRs target `develop`; `main` is updated at the end of each week before the report | Everyone | Now |

## Closed

| # | Item | Resolution |
|---|---|---|
| #2 | `frontend/src/services/api.ts` sets `withCredentials: true` (cookies); backend README #20 decided **`Authorization: Bearer` header, no cookies** | Fixed: `withCredentials` removed; Axios adds the Bearer header and refreshes once on 401 (`frontend/src/services/api.ts`). |
| #3 | Root README §16 still lists token transport as an **open decision** | Ticked in root README §16 (header, ADR-008). |
| #6 | Root README §8 ERD (`role ENUM(STUDENT…)`, `is_preview`, `content_assets`, `answer_options`, `MULTI` questions) is outdated; backend README says it replaces §8 | Root README §8 now marked outdated and points to `backend/README.md`; §10 points there for request bodies. |
| #4 | Root README §10 `POST /auth/register {email, password, fullName, role?}`; backend README: login by **username**, fields `firstName`/`lastName`, **no role on register** (always Student) | Register takes `accountType: Student | Instructor`; Instructor sign-ups are Students with `instructorRequestStatus: Pending` until an Admin approves (backend README §2, change #27). **M4:** keep the role picker; show "waiting for approval" when `instructorRequestStatus` is `Pending`. |
| #5 | FE `.env.development` → `http://localhost:8000/api/v1`; NestJS default port is 3000 | API port is **8000** (`backend/.env.example` `PORT=8000`), matching `frontend/.env.development`. |
| #7 | Root README §9 allows content access when `is_preview`; schema has **no `isPreview`** on `Lesson` | Kept: `Lesson.isPreview` added; `AccessPolicyService.canViewLesson` allows previews without enrollment (change #30). |
| #8 | Root README flow A uses `content_assets(PENDING_UPLOAD → READY)` and returns `assetId`; schema stores only `Lesson.videoKey` / `resourceKeys` | Option B: media keys written only at `/content/complete` after verification; an interrupted upload leaves no trace (change #31). |
| #11 | Root README flow D uses an **outbox** row; schema has no outbox table | `OutboxEvent` model + `OutboxService`; events written in the same transaction. Relay is week 7 (change #33). |
| #12 | Pub/Sub is at-least-once; nothing in the schema dedupes events | `Notification.sourceEventId String? @unique` added (change #33). |
| #13 | `QuizAttempt` has no rule that stops two `InProgress` attempts per student per quiz | Partial unique index `quiz_attempts_one_open_per_user` in the init migration (change #34). |
| #18 | Can a **Completed** student still take quizzes / submit? Not defined | Completed = read-only: content and own results, no new attempts or submissions (backend README §3.3, change #32). |
| — | Root `.gitignore` missing; `node_modules` was committed in history | Added in PR #2 |
| — | No local database for migrations | `infrastructure/docker-compose.yml` (PostgreSQL 16 + pgvector 0.8.7), PR #2 |
