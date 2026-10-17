# EduLine-INT3326-2

Online Education Platform project for INT3326 2.

EduLine is a production-oriented MVP of an online learning platform: course delivery, video/document content over a CDN, learning progress tracking, quizzes and assignments, an instructor dashboard, notifications, and an AI tutor that only answers from the course's own materials.

> **Status:** planning (Week 1). Everything below is the agreed target design; sections marked *(proposed)* still need team sign-off.

---

## Table of contents

1. [Team and ownership](#1-team-and-ownership)
2. [Scope](#2-scope)
3. [Architecture principles](#3-architecture-principles)
4. [Cloud provider: why GCP](#4-cloud-provider-why-gcp)
5. [System architecture (GCP)](#5-system-architecture-gcp)
6. [Tech stack](#6-tech-stack)
7. [Repository structure](#7-repository-structure)
8. [Data model (ERD)](#8-data-model-erd)
9. [RBAC and authorization](#9-rbac-and-authorization)
10. [API design (M2 modules)](#10-api-design-m2-modules)
11. [Key flows](#11-key-flows)
12. [Caching plan](#12-caching-plan)
13. [Events](#13-events)
14. [10-week roadmap](#14-10-week-roadmap)
15. [M2 week-by-week plan](#15-m2-week-by-week-plan)
16. [Open decisions](#16-open-decisions)

---

## 1. Team and ownership

| Member | Role | Owns |
|---|---|---|
| **M1 (An)** | Team Lead / Cloud Architect | Architecture, integration, security review, cost analysis |
| **M2 (Liêm)** | Backend 1 | Auth, users, **course CRUD**, **enrollment**, content (modules/lessons), **quiz API**, **assignment**, notification API |
| **M3 (Huyền Vũ)** | Backend 2 | Progress/event tracking, quiz scoring & results, instructor analytics |
| **M4 (KH)** | Frontend | Student / Instructor / Admin UI |
| **M5 (Dân)** | DevOps / Cloud | Docker, CI/CD, GCP deployment, monitoring, autoscaling, load testing |
| **M6 (Hưng)** | Media + AI/Data | Cloud Storage/CDN, async processing (Pub/Sub + worker), AI tutor RAG |

**Resolved ownership conflicts between the planning documents:** every disputed item goes to **M2**.

| Item | Owner |
|---|---|
| Enrollment (data model **and** endpoints), Week 3 | M2 |
| Course CRUD API, Week 3 | M2 |
| Quiz API **and** Assignment, Week 6 | M2 (M3 supports with scoring/results and quiz-attempt concurrency) |

---

## 2. Scope

**Users:** Student, Instructor, Administrator.

**Required use cases:** course management · enrollment · video/document content · learning progress · quiz/assessment · assignment submission · instructor dashboard · notifications.
**Advanced feature:** AI tutor (RAG over authorized course materials, with citations and a scope guard).

**Workload characteristics:** read-heavy content · large media files · concurrency peaks during quizzes · progress/event tracking.

**Required demos:** concurrent quiz load test · efficient media delivery · progress tracking · AI tutor evaluation.

---

## 3. Architecture principles

1. **Modular monolith, not microservices.** There is one backend deployable with strict internal modules. Six people and ten weeks are too few for microservices. Clean boundaries still allow extracting a module later.
2. **The API never carries large bytes.** Uploads and downloads go directly between the browser and Cloud Storage / Cloud CDN using **signed URLs**.
3. **Slow or non-critical work is async.** Notifications, email and AI document indexing go through Pub/Sub to a worker.
4. **Stateless containers.** JWT auth means no sticky sessions, so Cloud Run can scale out freely during quiz peaks.
5. **Cache only shared, read-heavy data** (catalog, course outline). Personal state (progress, attempts, submissions) always comes from PostgreSQL.

---

## 4. Cloud provider: why GCP

Any of AWS, GCP or Azure can run this platform: each has object storage, a CDN, managed PostgreSQL, a queue and container hosting. The deciding factors are **how easy the services are for a student team** and **how well they show the required features** (autoscaling, CDN, async, AI).

### Service mapping

| Need | GCP | AWS | Azure |
|---|---|---|---|
| Run containers + autoscale | **Cloud Run** | ECS Fargate / App Runner | Container Apps |
| PostgreSQL | Cloud SQL (+ pgvector) | RDS (+ pgvector) | Azure Database for PostgreSQL (+ pgvector) |
| Object storage | Cloud Storage | S3 | Blob Storage |
| CDN + signed URLs | Cloud CDN (via HTTPS Load Balancer) | CloudFront | Azure Front Door / CDN |
| Queue | Pub/Sub (push to Cloud Run) | SQS | Service Bus / Storage Queues |
| Redis | Memorystore | ElastiCache | Azure Cache for Redis |
| Secrets | Secret Manager | Secrets Manager | Key Vault |
| LLM + embeddings | **Vertex AI (Gemini, text-embedding)** | Bedrock | Azure OpenAI |
| Email | ❌ no native service (use SendGrid/Resend) | SES | Communication Services |
| Logs / metrics | Cloud Logging + Monitoring + Trace | CloudWatch + X-Ray | Azure Monitor + App Insights |
| CI/CD identity | Workload Identity Federation (GitHub OIDC) | IAM OIDC role | Federated credentials |
| Student credit | $300 free trial (+ education credits) | Free tier | $100 Azure for Students (no card) |

### Strengths for this project

**GCP (team choice)**
- **Cloud Run is the strongest fit.** You push a container and get HTTPS, autoscaling by request concurrency and scale-to-zero, with no VPC, cluster or task-definition setup. Scaling out during the quiz load test needs no extra work and is easy to show in the Cloud Run metrics.
- **Pub/Sub push subscriptions call the worker over HTTP.** The worker is just another Cloud Run service, with no polling loop and built-in retries plus a dead-letter topic.
- **Vertex AI** offers Gemini and embedding models in the same project, billed to the same credits, with IAM-based auth, so there is no third-party API key to protect.
- **Simpler IAM and console** than AWS. This matters for a 10-week course.
- Cloud Storage **object-finalize notifications** go straight to Pub/Sub, which is useful for "new PDF uploaded → index it for the AI tutor".

**AWS**
- The most mature and best-documented services for this exact workload (S3 + CloudFront signed URLs + SQS + SES).
- Native email (SES).
- More setup (VPC, ALB, ECS task definitions, IAM roles), which costs time without adding marks.

**Azure**
- The easiest student credit to get (no credit card).
- Container Apps is comparable to Cloud Run. Azure OpenAI is a strong AI option.
- Front Door is relatively expensive, and the portal and resource model are heavier to learn.

### GCP caveats and how we handle them

| Caveat | Mitigation |
|---|---|
| Cloud CDN signed URLs need an **external HTTPS Load Balancer** with a backend bucket (~$18/month for the forwarding rule) | One load balancer for everything (web, API, media). Without it in dev, fall back to Cloud Storage V4 signed URLs. |
| **Memorystore** has a minimum cost (~$35/month for 1 GB Basic) | Enable Redis only from Week 5 when caching starts. Turn it off outside demos. |
| Cloud Run → Memorystore / private Cloud SQL needs **Direct VPC egress** | Set up once by M5 in Terraform |
| No native email | SendGrid / Resend free tier for the worker. In-app notifications are the primary channel. |
| Cold starts on scale-to-zero | `min-instances=1` for the API during demos and the load test |

**Conclusion:** keep **GCP**. Its biggest advantage is Cloud Run, which makes autoscaling, async workers and the AI integration simpler than the AWS or Azure equivalents. The caveats above are known and cheap to work around.

---

## 5. System architecture (GCP)

```
                         ┌───────────────────────────────────────────┐
                         │                  USERS                    │
                         │    Student       Instructor       Admin   │
                         └─────────────────────┬─────────────────────┘
                                               │ HTTPS (eduline domain, Cloud DNS)
                                               ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │  External HTTPS Load Balancer  +  Cloud CDN  +  Cloud Armor (WAF, rate)  │
   │   /          → Serverless NEG → Cloud Run  "web"   (Next.js)             │
   │   /api/*     → Serverless NEG → Cloud Run  "api"   (CDN off, except      │
   │                                                    public catalog GETs)  │
   │   /media/*   → Backend bucket → GCS "media"  (Cloud CDN signed URLs)     │
   └──────────┬──────────────────────────┬──────────────────────────┬─────────┘
              │                          │                          │
              ▼                          ▼                          │
   ┌────────────────────┐   ┌───────────────────────────────────────┴───────────┐
   │ Cloud Run: web     │   │ Cloud Run: api  (modular monolith, NestJS)        │
   │ Next.js SSR        │   │ autoscale min 1 … max N, concurrency ~80/instance │
   └────────────────────┘   │                                                   │
                            │  M2 ─ auth · users · courses · enrollments ·      │
                            │       content (modules/lessons) · quizzes (API) · │
                            │       assignments · notifications (read API)      │
                            │  M3 ─ progress/events · quiz scoring · analytics  │
                            │  M6 ─ media (signed URLs) · ai-tutor (RAG query)  │
                            │  shared ─ config · logging · errors · validation ·│
                            │           guards (JwtAuth, Roles, CourseAccess) · │
                            │           Swagger /api/docs · /health             │
                            └──┬─────────┬───────────┬──────────┬───────────┬───┘
                               │         │           │          │           │
            Cloud SQL connector│         │ VPC egress│ publish  │ IAM       │ V4 signed PUT/GET
                               ▼         ▼           ▼          ▼           ▼
                   ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────────┐
                   │ Cloud SQL  │ │Memorystore│ │ Pub/Sub  │ │ Secret  │ │ Cloud Storage    │
                   │ PostgreSQL │ │ Redis     │ │ topics:  │ │ Manager │ │ - media (video,  │
                   │ + pgvector │ │ - catalog │ │ notific. │ │ JWT key │ │   pdf)           │
                   │ users,     │ │   cache   │ │ email    │ │ DB pwd  │ │ - submissions    │
                   │ courses,   │ │ - rate    │ │ ai-ingest│ │ SendGrid│ │   (private)      │
                   │ results,   │ │   limits  │ │ (+DLQ)   │ └─────────┘ └────────┬─────────┘
                   │ vectors    │ └───────────┘ └────┬─────┘                      │ object finalize
                   └─────▲──────┘                    │ push (HTTP)                │ notification
                         │                           ▼                            ▼
                         │        ┌───────────────────────────────────────────────────────┐
                         └────────┤ Cloud Run: worker   (scales on Pub/Sub push volume)   │
                                  │  - notification handler → notifications table         │
                                  │  - email handler → SendGrid / Resend                  │
                                  │  - ai-ingest: PDF → text → chunk → embed → pgvector   │
                                  └──────────────────────────┬────────────────────────────┘
                                                             ▼
                                              ┌──────────────────────────────┐
                                              │ Vertex AI                    │
                                              │ Gemini (answer) +            │
                                              │ text-embedding (vectors)     │
                                              └──────────────────────────────┘

 Cross-cutting (M5)
 GitHub ─push─► GitHub Actions (Workload Identity Federation)
                lint → test → security scan → docker build → Artifact Registry → deploy Cloud Run
 Cloud Logging + Cloud Monitoring dashboards/alerts + Cloud Trace · Terraform in infrastructure/
 k6 load tests: 50 / 100 / 500 concurrent quiz users
```

### Requirement → component

| Requirement | GCP component | Why |
|---|---|---|
| Object storage + CDN | Cloud Storage + Cloud CDN signed URLs | Media bytes bypass the API, and edge caching serves the read-heavy content |
| Transactional store | Cloud SQL PostgreSQL | Relational data. Quiz submit and grading need ACID. |
| Async processing | Pub/Sub → Cloud Run worker | Notifications, email and AI indexing never block a request |
| Cache where justified | Memorystore Redis (catalog and outline only) | Shared data that is read often and rarely changes |
| Autoscaling | Cloud Run concurrency-based autoscaling | Stateless API, ready for the quiz peak |
| AI tutor | Vertex AI + pgvector | No separate vector DB. `WHERE course_id = ?` enforces the scope. |
| Security | Cloud Armor, Secret Manager, IAM service accounts per service | WAF and rate limiting at the edge, no secrets in code, least privilege |

---

## 6. Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js (React, TypeScript) | SSR for the public catalog. Named in the plan. |
| Backend | NestJS (TypeScript) | Modules map to the modular monolith, plus built-in guards, validation pipes and Swagger. Shares a language with the FE. |
| ORM / migrations | Prisma | Typed schema and versioned migrations |
| Database | PostgreSQL 16 + pgvector on Cloud SQL | See section 5 |
| Cache | Redis (Memorystore) | Catalog cache and rate limiting |
| Queue | Pub/Sub | Managed, push delivery, retries + DLQ |
| Storage | Cloud Storage | V4 signed URLs for upload, Cloud CDN signed URLs for viewing |
| Auth | JWT access (15 min) + rotating refresh token (7 days, hashed in DB), argon2/bcrypt | Stateless, works with autoscaling |
| AI | Vertex AI Gemini + text-embedding | Same cloud and billing, IAM auth |
| Worker | Cloud Run service (Node or Python; M6 decides) | Python has the stronger PDF/embedding libraries |
| Testing | Jest + Supertest (unit/e2e), k6 (load) | |
| CI/CD | GitHub Actions → Artifact Registry → Cloud Run | |
| IaC | Terraform | Reproducible environments |
| Local dev | docker-compose: api, web, worker, postgres(pgvector), redis, fake-gcs-server, Pub/Sub emulator | Same stack for everyone |

---

## 7. Repository structure

```
EduLine-INT3326-2/
├── frontend/                  # M4: Next.js
├── backend/                   # M2 + M3: NestJS modular monolith
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/            # shared (M2 + M3, Week 2)
│   │   │   ├── config/        # env loading + validation
│   │   │   ├── database/      # Prisma service
│   │   │   ├── errors/        # global exception filter, error codes
│   │   │   ├── guards/        # JwtAuthGuard, RolesGuard, CourseAccessGuard
│   │   │   ├── decorators/    # @Roles(), @CurrentUser(), @Public()
│   │   │   ├── pagination/
│   │   │   └── logging/       # request id, structured JSON logs (Cloud Logging format)
│   │   ├── modules/
│   │   │   ├── auth/          # M2
│   │   │   ├── users/         # M2
│   │   │   ├── courses/       # M2
│   │   │   ├── enrollments/   # M2
│   │   │   ├── content/       # M2  modules + lessons + metadata
│   │   │   ├── quizzes/       # M2  quiz/question CRUD + attempt API
│   │   │   ├── assignments/   # M2
│   │   │   ├── notifications/ # M2  read API
│   │   │   ├── progress/      # M3
│   │   │   ├── scoring/       # M3  quiz scoring + results
│   │   │   ├── analytics/     # M3
│   │   │   ├── media/         # M6  signed URL service
│   │   │   └── ai-tutor/      # M6
│   │   └── events/            # event contracts published to Pub/Sub
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts            # demo data
│   └── test/                  # e2e tests
├── worker/                    # M6
├── infrastructure/            # M1 + M5: Terraform, docker-compose, k6 scripts
├── docs/                      # architecture, ERD, API, ADRs
└── .github/workflows/         # M5
```

**Branches:** `main` (production), `develop` (integration), `feature/*`. PRs into `develop` need CI to pass and one review.

**Module boundary rule:** a module only reads and writes its own tables. To use another module's data, it calls that module's exported service. For example, `assignments` calls `EnrollmentsService.assertEnrolled()` and never queries `enrollments` directly.

---

## 8. Data model (ERD)

```
users                          courses                         course_modules
 id (uuid) PK          1     N  id PK                    1   N  id PK
 email UNIQUE          ───────< instructor_id FK→users ───────< course_id FK
 password_hash                  title, slug UNIQUE              title, position
 full_name                      description, thumbnail_key          │1
 role ENUM(STUDENT,             status ENUM(DRAFT,                  │N
   INSTRUCTOR, ADMIN)             PUBLISHED, ARCHIVED)          lessons
 avatar_key                     created_at, published_at         id PK, module_id FK
 is_active, created_at                                           title, position
                                                                 type ENUM(VIDEO, DOCUMENT,
refresh_tokens                 enrollments                         QUIZ, ASSIGNMENT)
 id, user_id FK                 id PK                            duration_sec, is_preview
 token_hash                     user_id FK, course_id FK         content_asset_id FK
 expires_at, revoked_at         status ENUM(ACTIVE,
                                  DROPPED, COMPLETED)          content_assets (M6 storage fields)
                                enrolled_at                      id, course_id FK
                                UNIQUE(user_id, course_id)       type ENUM(VIDEO, PDF)
                                                                 storage_key, mime_type, size_bytes
                                                                 status ENUM(PENDING_UPLOAD,
                                                                   READY, FAILED)
                                                                 uploaded_by FK→users

quizzes (M2)                   questions (M2)                  answer_options (M2)
 id, course_id FK              id, quiz_id FK                  id, question_id FK
 lesson_id FK?                 type ENUM(SINGLE, MULTI)        text, is_correct
 title, time_limit_sec         text, points, position
 max_attempts, is_published

quiz_attempts (M2 API / M3 scoring)          attempt_answers
 id, quiz_id FK, student_id FK                id, attempt_id FK, question_id FK
 started_at, submitted_at, expires_at         selected_option_ids uuid[]
 status ENUM(IN_PROGRESS, SUBMITTED)
 score, max_score

assignments (M2)                              submissions (M2)
 id, course_id FK, lesson_id FK?              id, assignment_id FK, student_id FK
 title, instructions, due_at                  file_key, file_name, size_bytes, mime_type
 max_score, allow_late, created_by            submitted_at, status ENUM(SUBMITTED, GRADED)
                                              score, feedback, graded_by, graded_at
                                              UNIQUE(assignment_id, student_id)

notifications (M2)
 id, user_id FK, type, title, body, link, payload JSONB, read_at, created_at
 INDEX(user_id, read_at, created_at DESC)

── M3 ── lesson_progress(user_id, lesson_id, last_position_sec, percent, completed_at)
         progress_events(id, user_id, lesson_id, type, payload, occurred_at)
── M6 ── document_chunks(id, course_id, asset_id, page, text, embedding vector)
```

**Key indexes:** `courses(status, published_at)`, `enrollments(user_id)`, `enrollments(course_id)`, `lessons(module_id, position)`, `quiz_attempts(quiz_id, student_id)`, `submissions(assignment_id)`.

---

## 9. RBAC and authorization

There are two layers. **Role check** (`RolesGuard`) asks what kind of user this is. **Resource check** (`CourseAccessGuard` / `AccessPolicy`) asks what this user's relationship is to *this* course.

| Action | Student | Instructor | Admin |
|---|---|---|---|
| Browse published catalog / outline | ✅ | ✅ | ✅ |
| View lesson content (signed URL) | enrolled (or `is_preview`) | owner | ✅ |
| Create course | ❌ | ✅ | ✅ |
| Edit/publish course, modules, lessons, quizzes | ❌ | owner | ✅ |
| Enroll / unenroll | ✅ (published only) | ❌ | ✅ |
| Take quiz | enrolled | ❌ | ❌ |
| Create assignment | ❌ | owner | ✅ |
| Submit assignment | enrolled | ❌ | ❌ |
| View/grade submissions, view quiz results | own only | owner's course | ✅ |
| Manage users and roles | ❌ | ❌ | ✅ |

Everyone reuses one central rule: `AccessPolicy.canAccessCourseContent(user, courseId)` returns true for an admin, the course owner, or a student with an active enrollment.

---

## 10. API design (M2 modules)

Base path is `/api/v1`, documented in Swagger at `/api/docs`.

**Conventions**
- JSON, camelCase, ISO-8601 UTC timestamps, UUID ids
- Lists: `{ "data": [...], "meta": { "page": 1, "pageSize": 20, "total": 134 } }`
- Errors: `{ "error": { "code": "COURSE_NOT_FOUND", "message": "...", "details": [], "requestId": "..." } }`
- Status codes: 400 validation · 401 unauthenticated · 403 forbidden (role/owner/enrollment) · 404 · 409 conflict · 422 business rule · 429 rate limited

### Auth and users (Week 3)
```
POST   /auth/register              {email, password, fullName, role?}  role ∈ STUDENT|INSTRUCTOR
POST   /auth/login                 → {accessToken, refreshToken, user}
POST   /auth/refresh               rotate refresh token
POST   /auth/logout                revoke refresh token
GET    /users/me
PATCH  /users/me                   {fullName, avatarKey}
PATCH  /users/me/password
GET    /admin/users                ?role=&q=&page=        [ADMIN]
PATCH  /admin/users/:id            {role, isActive}       [ADMIN]
```

### Courses and enrollment (Week 3)
```
GET    /courses                    public catalog (PUBLISHED)   ← cached
GET    /courses/:idOrSlug          detail + outline, no media URLs ← cached
POST   /courses                    [INSTRUCTOR, ADMIN]
PATCH  /courses/:id                [owner, ADMIN]
POST   /courses/:id/publish        [owner, ADMIN]  needs ≥1 module with ≥1 lesson
DELETE /courses/:id                soft delete → ARCHIVED
GET    /instructor/courses         own courses, all statuses
POST   /courses/:id/enroll         [STUDENT]  409 if already enrolled
DELETE /courses/:id/enroll         → DROPPED
GET    /me/courses                 My Courses (+ progress % from M3)
GET    /courses/:id/students       [owner, ADMIN]
```

### Content (Week 4)
```
POST   /courses/:id/modules                  PATCH /modules/:id        DELETE /modules/:id
PATCH  /courses/:id/modules/reorder          {orderedIds}
POST   /modules/:id/lessons                  PATCH /lessons/:id        DELETE /lessons/:id
PATCH  /modules/:id/lessons/reorder
POST   /lessons/:id/content/upload-url       [owner] → {uploadUrl, assetId}  (GCS V4 signed PUT)
POST   /lessons/:id/content/complete         [owner] verify object in GCS → asset READY
GET    /lessons/:id                          [canAccessCourseContent] → metadata + Cloud CDN signed URL
```

### Quizzes (Week 6)
```
POST   /courses/:id/quizzes                  [owner]
PATCH  /quizzes/:id                          [owner]
POST   /quizzes/:id/questions                [owner]   PATCH/DELETE /questions/:id
POST   /quizzes/:id/publish                  [owner]
GET    /quizzes/:id                          [enrolled] questions without correct answers
POST   /quizzes/:id/attempts                 [enrolled] start (checks max_attempts, sets expires_at)
PUT    /attempts/:id/answers                 save answers (idempotent, before expiry)
POST   /attempts/:id/submit                  one transaction: lock attempt → score (M3) → SUBMITTED
GET    /attempts/:id                         result (own attempt / owner)
GET    /quizzes/:id/attempts                 [owner] all results
```

### Assignments (Week 6)
```
POST   /courses/:id/assignments              [owner]
GET    /courses/:id/assignments              [enrolled | owner]
GET    /assignments/:id                      PATCH /assignments/:id [owner]
POST   /assignments/:id/submissions/upload-url  [enrolled] validate MIME/size → signed PUT
POST   /assignments/:id/submissions          {fileKey, fileName} confirm (checks due date)
GET    /assignments/:id/submissions          [owner]
GET    /assignments/:id/submissions/me       [student]
GET    /submissions/:id/download-url         [owner | submitter] signed GET
PATCH  /submissions/:id/grade                [owner] {score, feedback} → ASSIGNMENT_GRADED event
```

### Notifications (Week 7)
```
GET    /notifications              ?unread=true&page=
GET    /notifications/unread-count
PATCH  /notifications/:id/read
PATCH  /notifications/read-all
```
The worker creates notifications. The API only reads them and marks them as read.

---

## 11. Key flows

**A. Instructor uploads a video (M2 + M6)**
```
FE → POST /lessons/:id/content/upload-url
     API: owner? → content_assets(PENDING_UPLOAD) → MediaService.signPut(key) → URL
FE ──PUT bytes──► Cloud Storage            (API never sees the file)
FE → POST /lessons/:id/content/complete → API checks object exists → READY
     PDF? → GCS finalize notification → Pub/Sub ai-ingest → worker indexes for AI tutor
```

**B. Student opens a lesson (enrollment enforced)**
```
FE → GET /lessons/:id
     API: canAccessCourseContent? no → 403
                                  yes → Cloud CDN signed URL (TTL ~10 min)
FE <video src=signedUrl> ──► Cloud CDN edge (cache) ──► GCS backend bucket on miss
```

**C. Concurrent quiz submit (peak load)**
```
FE → POST /attempts/:id/submit
     API (stateless, many Cloud Run instances):
       BEGIN; SELECT attempt FOR UPDATE; check not submitted & not expired;
       score via ScoringService (M3); UPDATE attempt; COMMIT
     Double submit → second call sees SUBMITTED → returns the same result (idempotent)
```

**D. Assignment graded → notification**
```
Instructor → PATCH /submissions/:id/grade
     API: transaction { update submission; insert outbox row } → 200 immediately
     Outbox relay → Pub/Sub "notifications" → push → worker → insert notifications row (+ email)
Student FE → GET /notifications/unread-count (poll ~30 s)
```

---

## 12. Caching plan

| Data | Cache | Key | Invalidation |
|---|---|---|---|
| Published catalog page | Redis, TTL 60 s (+ CDN for anonymous GET) | `catalog:v{n}:p:{page}:q:{hash}` | TTL, version bump on publish |
| Course detail + outline | Redis, TTL 5 min | `course:{id}:outline` | Delete on any course/module/lesson edit |
| Enrollment check | Optional, TTL 30 s | `enr:{userId}:{courseId}` | Delete on enroll/unenroll |
| Progress, attempts, submissions | ❌ never | n/a | Personal and transactional |
| Media bytes | Cloud CDN | n/a | Immutable object keys (new upload = new key) |

All caching goes through one `CacheService` that can be switched off by config, which makes the before/after load-test numbers easy to measure.

---

## 13. Events

```json
{
  "eventId": "uuid",
  "type": "ASSIGNMENT_GRADED",
  "occurredAt": "2026-11-20T08:00:00Z",
  "data": { "submissionId": "...", "assignmentId": "...", "courseId": "...",
            "studentId": "...", "score": 8.5, "maxScore": 10 }
}
```

| Event | Producer | Consumer |
|---|---|---|
| `ASSIGNMENT_GRADED` | M2 assignments | worker → notification (+ email) |
| `ENROLLMENT_CREATED` | M2 enrollments | worker → welcome notification |
| `COURSE_PUBLISHED` | M2 courses | cache invalidation, notification |
| `QUIZ_SUBMITTED` | M2 quizzes | M3 analytics |
| `LESSON_CONTENT_READY` | M2 content / GCS finalize | worker → AI ingest |
| `LESSON_OPENED`, `VIDEO_PROGRESS`, … | M3 progress | M3 progress writer |

Pub/Sub delivers **at least once**, so consumers must be idempotent and dedupe on `eventId`. Failed messages go to a dead-letter topic.

---

## 14. 10-week roadmap

| Week | Goal | Demo output |
|---|---|---|
| 1 | Requirements and architecture | Architecture diagram, use cases, ERD, wireframes, tech stack, backlog |
| 2 | Foundation | FE → BE → PostgreSQL works. `git push` → CI lint + test + build. |
| 3 | Auth + course + enrollment | Instructor creates course → Student logs in, browses, enrolls, sees My Courses |
| 4 | Video / document / CDN | Instructor uploads video/PDF → enrolled student views via Cloud CDN. Non-enrolled gets 403. |
| 5 | Learning progress | Watch video → close browser → log in again → resume where they left off |
| 6 | Quiz and assignment | Student takes quiz → gets score → uploads assignment → instructor grades |
| 7 | Async + notifications + instructor dashboard | Grade → Pub/Sub → worker → student notification. Dashboard stats. |
| 8 | AI tutor + security | In-scope question → answer + citation. Out-of-scope → refusal. Security checklist. |
| 9 | Load test, autoscaling, observability, CI/CD | 500 concurrent quiz users → Cloud Run scales → latency/error dashboards |
| 10 | Integration, cost, final demo | End-to-end MVP, performance results, cost estimate (100 / 1k / 10k users), presentation |

---

## 15. M2 week-by-week plan

| Week | Work | Done when | Depends on |
|---|---|---|---|
| 1 | ERD + OpenAPI draft for auth, users, courses, enrollment, content, quizzes, assignments, notifications. RBAC matrix. | Reviewed by M1, M3, M4 | n/a |
| 2 | (with M3) NestJS skeleton, env validation, Prisma + first migration, error filter, response conventions, Swagger, `/health`, base models, Jest | FE calls `/api/v1/health` which reads the DB. CI is green. | M5 Dockerfile/CI |
| 3 | Register/login/refresh/logout, JWT + Roles guards, profile, admin users, course CRUD + publish, **enrollment endpoints**, `AccessPolicy` | The Week 3 demo flow passes. e2e tests for 401/403. | M4 UI, M5 dev deploy |
| 4 | Module/lesson CRUD + reorder, content metadata, upload-url/complete, `GET /lessons/:id` with signed URL | Enrolled → content plays. Not enrolled → 403. | M6 media service, M5 LB/CDN/IAM |
| 5 | Read-optimized catalog/outline queries (no N+1), Redis cache-aside, indexes | p95 before/after cache measured | M5 Memorystore |
| 6 | **Quiz API** (CRUD, start/save/submit attempt, transactional submit) + **assignment** module | Quiz and assignment demo passes. No binaries in the DB. | M3 scoring, M6 submission storage, M4 UI |
| 7 | Notifications table + read API, outbox + `ASSIGNMENT_GRADED` publishing, event contract doc | Grade → notification appears | M6 worker, M5 deploys the worker |
| 8 | Security (with M1, M5): strict DTO validation, auth rate limits, RBAC audit of every endpoint, file MIME/size checks, no raw SQL, helmet/CORS, secrets in Secret Manager | Checklist + negative tests | n/a |
| 9 | Fix k6 bottlenecks: indexes, connection pool vs Cloud Run max instances, cache, payload size | Before/after numbers for the slides | M5 load results |
| 10 | Integration tests, bug fixes, seed script (admin, 2 instructors, 20 students, 3 full courses) | One-command demo reset | M4 demo flow |

---

## 16. Open decisions

- [x] Cloud provider: **GCP**
- [x] Ownership conflicts → M2 (enrollment, course CRUD, quiz API, assignment)
- [x] Backend framework: **NestJS**
- [x] ORM: **Prisma**
- [ ] Token transport: Authorization header (simpler) or httpOnly cookie (safer vs XSS, needs CSRF protection)
- [ ] Assignment resubmission: one per student, or numbered attempts
- [ ] Email provider for the worker: SendGrid or Resend
- [ ] Cloud SQL connection limit vs Cloud Run `max-instances` (pool size × instances must stay under the DB limit)
