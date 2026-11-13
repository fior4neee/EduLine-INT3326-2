# Integration Review (M1)

Snapshot: 2026-10-21, updated 2026-11-02 (M2 week 3 backend), branch `main` (`9ef50c5e`) + PR #2. Updated 2026-11-09 (M1 weeks 2–7 audit, `develop` `fa3af135`).
Source of truth order: `backend/prisma/schema.prisma` → `backend/README.md` → root `README.md` → Google Doc.

Each item is a mismatch between two parts of the repo, or a gap that will block a later week. Owner fixes it; M1 checks it off.

## Open items

| # | Area | Found | Impact | Proposed fix | Owner | Needed by |
|---|---|---|---|---|---|---|
| 1 | Frontend | Root README §5/§6 says **Next.js SSR on Cloud Run "web"**; code is **React + Vite** SPA | Architecture diagram and deploy plan are wrong | Keep Vite, serve the build from a GCS bucket behind the LB + CDN (see [ADR-007](architecture-decisions.md#adr-007-frontend-as-a-static-spa-on-cloud-storage--cdn)) | M1, M4 | Week 3 |
| 9 | Media | Example key `courses/1234/lessons/9901/video.mp4` is **reused when a video is replaced** | Cloud CDN keeps serving the old cached video | Add a random part: `courses/{courseId}/lessons/{lessonId}/{uuid}.mp4` (see [storage-cdn-iam.md](storage-cdn-iam.md)) | M6 | Week 4 |
| 10 | Media | CDN signed URL TTL "~10 minutes" | HTML5 video makes new range requests during playback; after 10 min the URL is expired and seeking/buffering fails | Video URLs: TTL ≥ 2 h. Documents: 10 min is fine (see storage doc) | M6 | Week 4 |
| 14 | Progress | `lesson_progress`, `progress_events` (M3) and `document_chunks` (M6) are not in `schema.prisma` yet | `Enrollment.completedAt` and AI tutor have nowhere to read from | M3/M6 add their models to the same schema (one migration history) | M3, M6 | Week 5 / 8 |
| 15 | DB | `CREATE EXTENSION vector` was run by hand in local Docker only | Cloud SQL and teammates' DBs will not have it | Prisma `previewFeatures = ["postgresqlExtensions"]` + `extensions = [vector]`, or an SQL migration. **Checked 14/11 (M1):** local Docker (`pgvector/pgvector:pg16`) has `vector` 0.8.7 *installed* by hand, with no migration; Cloud SQL offers 0.8.5 (see #24), so the migration must not pin a version | M2, M6 | Week 8 |
| 16 | Local dev | Root README §6 lists docker-compose with api, web, worker, postgres, redis, fake-gcs, Pub/Sub emulator; `infrastructure/docker-compose.yml` has **postgres only** | Expected, not a bug | Add services as each one starts to exist (api in week 3, redis week 5, emulator week 7) | M1, M5 | Rolling |
| 17 | Git | `develop` exists; PR #1 was merged straight into `main` | Two integration branches drift | All PRs target `develop`; `main` is updated at the end of each week before the report | Everyone | Now |
| 19 | Frontend | Merge commit `059bd677` (PR #5) kept the old `frontend/src/services/api.ts`, `auth.ts`, `courses.ts` and dropped M2's functions (`getErrorMessage`, `listUsers`, `createModule`, …). `tsc -b` on `develop`: 30+ errors | `develop` frontend shows a blank page; every page that imports the removed functions is broken | Redo the conflict resolution: keep both sides of `services/*.ts`, then `npm run build` must pass | M4 (with M2) | Now |
| 20 | CI | Nothing checks a PR before merge, so #19 reached `develop` | Broken builds land on the shared branch | GitHub Actions on every PR to `develop`: frontend `npm run build`; backend `npm ci`, `npm test`, `npm run build`. Branch protection: PR + green CI required | M5 (M1 reviews) | Week 6 |
| 21 | Quiz | No endpoint creates or submits a `QuizAttempt` (only `analytics` reads it). [quiz-submission-design.md](quiz-submission-design.md) §3 is not implemented | Week 6 demo (student takes a quiz) and week 9 load test (concurrent quiz submit) cannot run | Implement start / save / submit per the design, with the race tests in §5 | M2 (API), M3 (scoring is done) | Week 6 → before week 9 |
| 22 | Async | The outbox is processed inside the API process; nothing publishes to Pub/Sub. Topic `notifications` + dead-letter now exist on GCP (`infrastructure/README.md`) | Week 7 demo path (event → queue → worker) not complete; ADR-005 has no measured evidence | M2: outbox relay publishes to topic `notifications` (`sa-api` already has `pubsub.publisher` on it). M6: worker. M5: deploy worker, switch subscription `notifications-worker` to push | M2, M6, M5 | Week 7 |
| 23 | Backend | `backend/package.json` has no `postinstall`; after `npm ci` the Prisma client is missing (`@prisma/client did not initialize yet`). Hit twice | Every fresh install / CI run fails until someone runs `prisma generate` | Add `"postinstall": "prisma generate"` | M2 | Now |
| 24 | DB | Cloud SQL `eduline-db` has no `vector` extension (see #15) | AI tutor (week 8) needs pgvector on the cloud DB | Add `CREATE EXTENSION IF NOT EXISTS vector;` as a Prisma migration before the `document_chunks` migration. **Checked 14/11 (M1), via Auth Proxy, read-only:** `select name, default_version, installed_version from pg_available_extensions where name='vector'` → `vector | 0.8.5 | (empty)`: **available, not installed** on `eduline` (PostgreSQL 16.15; `pg_extension` has only `plpgsql`). Creating it needs a member of `cloudsqlsuperuser` (users made with `gcloud sql users create` are; not verified for `eduline` here, the first run on `eduline_staging` will show it). M1 runs the migration through the proxy before deploying the API that needs it (D7). Not created now: that is M6's migration | M6 (M1 checks on Cloud SQL) | Week 8 |

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

## Cloud verification (2026-11-09)

Environment: see [infrastructure/README.md](../../infrastructure/README.md). API `https://api-ziqtauotba-as.a.run.app/api/v1`.

| Week | Check | Result |
|---|---|---|
| 2 | `GET /health` on Cloud Run (Cloud SQL through Auth Proxy) | 200 `{"status":"ok","database":"up"}` |
| 2 | Port 5432 on the Cloud SQL public IP | Closed (`TcpTestSucceeded: False`), see ADR-009 |
| 3 | `GET /admin/users`: no token / Student / Admin | 401 / 403 / 200 |
| 4 | Non-enrolled student opens a lesson | Covered by `test/content.int-spec.ts` L02 (403 `LESSON_LOCKED`) |
| 6 | Quiz submit transaction | Not reviewable yet: endpoints missing (#21). Scoring itself: `test/scoring.int-spec.ts` |
| 4–7 | Backend integration tests `npm run test:int` (local `eduline_test`, 5 migrations) | 6 suites, **75/75 passed** (assignments, notifications, analytics, progress, content, scoring) |
| 7 | Pub/Sub publish → pull, dead-letter policy | OK (`notifications` → `notifications-worker`, DLQ after 5 attempts). Idempotent handling: `test/notifications.int-spec.ts` N04, N11 |
