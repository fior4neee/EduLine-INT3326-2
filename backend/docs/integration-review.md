# Integration Review (M1)

Snapshot: 2026-10-21, branch `main` (`9ef50c5e`) + PR #2.
Source of truth order: `backend/prisma/schema.prisma` → `backend/README.md` → root `README.md` → Google Doc.

Each item is a mismatch between two parts of the repo, or a gap that will block a later week. Owner fixes it; M1 checks it off.

## Open items

| # | Area | Found | Impact | Proposed fix | Owner | Needed by |
|---|---|---|---|---|---|---|
| 1 | Frontend | Root README §5/§6 says **Next.js SSR on Cloud Run "web"**; code is **React + Vite** SPA | Architecture diagram and deploy plan are wrong | Keep Vite, serve the build from a GCS bucket behind the LB + CDN (see [ADR-007](architecture-decisions.md#adr-007-frontend-as-a-static-spa-on-cloud-storage--cdn)) | M1, M4 | Week 3 |
| 2 | Auth | `frontend/src/services/api.ts` sets `withCredentials: true` (cookies); backend README #20 decided **`Authorization: Bearer` header, no cookies** | Login will "work" locally but tokens are never sent | Remove `withCredentials`, add an Axios interceptor that sets the header and calls `/auth/refresh` on 401 | M4 | Week 3 |
| 3 | Auth | Root README §16 still lists token transport as an **open decision** | Confusing for new readers | Tick it: header (backend README #20) | M1 | Week 3 |
| 4 | Auth | Root README §10 `POST /auth/register {email, password, fullName, role?}`; backend README: login by **username**, fields `firstName`/`lastName`, **no role on register** (always Student) | FE form and API contract disagree | Root README §10 should point to backend README for request bodies | M2 | Week 3 |
| 5 | API port | FE `.env.development` → `http://localhost:8000/api/v1`; NestJS default port is 3000 | FE cannot reach BE out of the box | Pick one port, put it in `backend/.env.example` and `frontend/.env.development` | M2, M4 | Week 3 |
| 6 | Data model | Root README §8 ERD (`role ENUM(STUDENT…)`, `is_preview`, `content_assets`, `answer_options`, `MULTI` questions) is outdated; backend README says it replaces §8 | People code against the wrong model | Replace §8 with a link to `backend/README.md` | M2 | Week 3 |
| 7 | RBAC | Root README §9 allows content access when `is_preview`; schema has **no `isPreview`** on `Lesson` | Preview lessons are not possible | Either add `Lesson.isPreview Boolean @default(false)` or drop preview from §9. M1 suggests dropping it for the MVP | M2 | Week 4 |
| 8 | Media | Root README flow A uses `content_assets(PENDING_UPLOAD → READY)` and returns `assetId`; schema stores only `Lesson.videoKey` / `resourceKeys` | No place to track an upload that started but never finished; `/content/complete` has nothing to update | Option A: add a small `ContentAsset` table (`key, lessonId, type, status, sizeBytes, uploadedById`). Option B: write `videoKey` only in `/complete`, after the object is verified. M1 suggests **B** for the MVP (fewer tables) | M2, M6 | Week 4 |
| 9 | Media | Example key `courses/1234/lessons/9901/video.mp4` is **reused when a video is replaced** | Cloud CDN keeps serving the old cached video | Add a random part: `courses/{courseId}/lessons/{lessonId}/{uuid}.mp4` (see [storage-cdn-iam.md](storage-cdn-iam.md)) | M6 | Week 4 |
| 10 | Media | CDN signed URL TTL "~10 minutes" | HTML5 video makes new range requests during playback; after 10 min the URL is expired and seeking/buffering fails | Video URLs: TTL ≥ 2 h. Documents: 10 min is fine (see storage doc) | M6 | Week 4 |
| 11 | Async | Root README flow D uses an **outbox** row; schema has no outbox table | Grading can commit while the event is lost (or the reverse) | Add `OutboxEvent` table (see [ADR-005](architecture-decisions.md#adr-005-notifications-are-asynchronous-pubsub--outbox)) | M2 | Week 7 |
| 12 | Async | Pub/Sub is at-least-once; nothing in the schema dedupes events | Duplicate notifications | Add `Notification.sourceEventId String? @unique`; worker inserts with skip-duplicates | M2, M6 | Week 7 |
| 13 | Quiz | `QuizAttempt` has no rule that stops two `InProgress` attempts per student per quiz | Concurrent "start" requests can exceed `maxAttempts` | Partial unique index in the migration (see [quiz-submission-design.md](quiz-submission-design.md)) | M2 | Week 6 |
| 14 | Progress | `lesson_progress`, `progress_events` (M3) and `document_chunks` (M6) are not in `schema.prisma` yet | `Enrollment.completedAt` and AI tutor have nowhere to read from | M3/M6 add their models to the same schema (one migration history) | M3, M6 | Week 5 / 8 |
| 15 | DB | `CREATE EXTENSION vector` was run by hand in local Docker only | Cloud SQL and teammates' DBs will not have it | Prisma `previewFeatures = ["postgresqlExtensions"]` + `extensions = [vector]`, or an SQL migration | M2, M6 | Week 8 |
| 16 | Local dev | Root README §6 lists docker-compose with api, web, worker, postgres, redis, fake-gcs, Pub/Sub emulator; `infrastructure/docker-compose.yml` has **postgres only** | Expected, not a bug | Add services as each one starts to exist (api in week 3, redis week 5, emulator week 7) | M1, M5 | Rolling |
| 17 | Git | `develop` exists; PR #1 was merged straight into `main` | Two integration branches drift | All PRs target `develop`; `main` is updated at the end of each week before the report | Everyone | Now |
| 18 | Enrollment | Can a **Completed** student still take quizzes / submit? Not defined | RBAC tests cannot be written for it | M1 suggests: Completed = read-only, like Archived | M2 (decide) | Week 3 |

## Closed

| # | Item | Resolution |
|---|---|---|
| — | Root `.gitignore` missing; `node_modules` was committed in history | Added in PR #2 |
| — | No local database for migrations | `infrastructure/docker-compose.yml` (PostgreSQL 16 + pgvector 0.8.7), PR #2 |
