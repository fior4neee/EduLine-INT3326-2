# Architecture Decision Records (M1)

Short records of why the system looks the way it does. Each one answers a question the final presentation (week 10) must answer. Status: **Accepted** = team agreed (in a README), **Proposed** = waiting for team sign-off.

| ADR | Question | Status |
|---|---|---|
| [001](#adr-001-google-cloud-platform) | Why GCP? | Accepted |
| [002](#adr-002-modular-monolith-not-microservices) | Why a modular monolith instead of microservices? | Accepted |
| [003](#adr-003-postgresql-not-mongodb-and-pgvector-not-a-separate-vector-db) | Why PostgreSQL instead of MongoDB? Why pgvector? | Accepted |
| [004](#adr-004-media-through-signed-urls-and-cloud-cdn) | Why signed URLs and a CDN? | Accepted |
| [005](#adr-005-notifications-are-asynchronous-pubsub--outbox) | Why async notifications? | Accepted (outbox: Proposed) |
| [006](#adr-006-cache-only-shared-read-heavy-data-and-measure-first) | Why Redis, and what is cached? | Accepted (order: Proposed) |
| [007](#adr-007-frontend-as-a-static-spa-on-cloud-storage--cdn) | Why no Next.js server? | Proposed |
| [008](#adr-008-access-token-in-the-authorization-header) | Header or cookie for the token? | Accepted |
| [009](#adr-009-cloud-sql-access-by-identity-auth-proxy--iam-not-by-ip) | How does the API reach the DB, and who else can? | Accepted |

---

## ADR-001: Google Cloud Platform

**Context.** We need containers with autoscaling, managed PostgreSQL, object storage + CDN, a queue, an LLM and embeddings, on a $300 trial credit, for a 6-person student team.

**Decision.** GCP (root README §4).

**Why.**
- Cloud Run: push a container, get HTTPS + autoscaling on request concurrency + scale to zero. No cluster, VPC or task definitions to manage. Autoscaling during the quiz test is visible in Cloud Run metrics with no extra work.
- Pub/Sub push calls the worker over HTTP with retries and a dead-letter topic: the worker is just another Cloud Run service.
- Vertex AI (Gemini + embeddings) in the same project, billed to the same credit, authenticated by IAM (no third-party API key).

**Trade-offs accepted.** No native email (SendGrid/Resend free tier). Cloud CDN signed URLs need the external HTTPS Load Balancer (fixed monthly cost). Memorystore has a minimum monthly cost.

**Rejected.** AWS: more setup (VPC, ALB, ECS) for the same result. Azure: easiest credit, but Front Door cost and heavier portal.

---

## ADR-002: Modular monolith, not microservices

**Context.** 6 people, 10 weeks, one database, features that share the same data (course → enrollment → content → quiz).

**Decision.** One NestJS API deployable with strict modules, plus one worker for async jobs.

**Why.** Microservices would add network calls, distributed transactions (quiz submit + scoring), separate CI pipelines and service discovery, none of which the course grades. A single deployable is easier to debug and load test.

**Guard rails.** A module only touches its own tables and calls other modules through their exported service (root README §7). This keeps the option to extract a module later (the AI tutor is the most likely candidate, because of different scaling and runtime).

**Trade-off.** One bad deploy affects every feature; the whole API scales as one unit.

---

## ADR-003: PostgreSQL, not MongoDB, and pgvector, not a separate vector DB

**Decision.** Cloud SQL for PostgreSQL 16 with the `vector` extension.

**Why PostgreSQL.**
- The data is relational: users ↔ enrollments ↔ courses ↔ modules ↔ lessons ↔ quizzes ↔ attempts. Foreign keys and unique constraints (`one enrollment per user per course`, `one answer per question per attempt`) enforce rules the code would otherwise have to check.
- Quiz submit needs a **transaction** across attempt and answers, under concurrency ([quiz-submission-design.md](quiz-submission-design.md)).
- Analytics (completion rate, average score) are SQL aggregates.

**Why pgvector.** The AI tutor's data volume is small (a few courses of PDFs). Keeping vectors next to the course data means the scope guard is just `WHERE course_id = $1`, and there is no second database to secure, pay for and back up.

**Trade-off.** Vertical scaling of one database; pgvector is slower than a dedicated vector DB at millions of vectors (not our scale).

---

## ADR-004: Media through signed URLs and Cloud CDN

**Decision.** Browser ↔ Cloud Storage directly with signed URLs; lesson media served by Cloud CDN with signed URLs ([storage-cdn-iam.md](storage-cdn-iam.md)).

**Why.**
- A 200 MB upload through the API would hold a Cloud Run instance and its memory for the whole transfer, and Cloud Run has request size limits. Direct upload keeps the API small and stateless.
- Learning content is read-heavy: the same video is watched by many students. The CDN serves repeated reads from the edge, which lowers latency and origin egress.
- Access control stays in the API: a signed URL is only issued after `canViewContent`.

**Trade-off.** Signed URLs can be shared until they expire (mitigated with short TTLs for documents). Video TTL must cover a viewing session (2 h), not 10 min.

---

## ADR-005: Notifications are asynchronous (Pub/Sub + outbox)

Week 7 question: *why async instead of synchronous?*

**Synchronous version:** `PATCH /submissions/:id/grade` → update DB → insert notification → call email API → respond.

| Concern | Synchronous | Asynchronous (chosen) |
|---|---|---|
| Latency for the instructor | Includes the email provider call (hundreds of ms to seconds) | DB write only, responds immediately |
| Email provider down | Grading fails or hangs | Grading succeeds; Pub/Sub retries the worker later |
| Load spike (grading 100 submissions) | 100 slow requests hold API instances | Worker scales separately from the API |
| Retries / failed messages | Hand-written | Built in: retry with backoff, dead-letter topic |
| Consistency | Immediate | Eventual: notification appears a few seconds later (acceptable for this feature) |
| Complexity | Low | Higher: topic, subscription, worker, idempotency |

**Decision.** Async for anything that is slow, external, or not needed in the response: notifications, email, AI document indexing, analytics events.

**Dual-write problem.** "Update DB, then publish" can lose the event if the process dies between the two. Fix: **transactional outbox**.
1. In the grading transaction, also insert an `OutboxEvent { id (eventId), type, payload, createdAt, publishedAt: null }`.
2. After commit, try to publish immediately and set `publishedAt`.
3. A Cloud Scheduler job calls `POST /internal/outbox/flush` every minute to publish anything still unpublished.

**Idempotency.** Pub/Sub delivers at least once. The worker stores `Notification.sourceEventId` (unique) and inserts with skip-duplicates, so a redelivered event creates no second notification.

**Schema changes needed (M2):** `OutboxEvent` model; `Notification.sourceEventId String? @unique` (integration-review #11, #12).

---

## ADR-006: Cache only shared read-heavy data, and measure first

Week 5 question: *what is worth caching?*

**Decision.** Keep root README §12: cache the published catalog (TTL 60 s) and course outline (TTL 5 min) behind one `CacheService` with an on/off switch. Never cache progress, attempts, submissions, notifications.

**Additions from review.**
- **Measure before adding Redis.** Week 5: run k6 on `GET /courses` and `GET /courses/:id` with cache **off** first, record p95, then switch on. The before/after numbers are the evidence for the presentation.
- **Cheaper first option.** Anonymous `GET /courses` can be cached by Cloud CDN at the load balancer with `Cache-Control: public, max-age=60`, at no extra cost. Memorystore (~$35/month minimum, root README §4) is justified only if the logged-in catalog/outline path is still a bottleneck, or for rate limiting.
- **Skip the enrollment-check cache** for now. A 30 s TTL means a suspended student keeps access for up to 30 s, and the check is one indexed lookup on `(userId, courseId)`.
- Invalidation events: course `PATCH`, publish, archive, any module/lesson change → delete `course:{id}:outline` and bump the catalog version.

---

## ADR-007: Frontend as a static SPA on Cloud Storage + CDN

**Context.** Root README planned Next.js SSR on Cloud Run "web". The code is React 19 + Vite (SPA), merged in PR #1.

**Decision (proposed).** Keep Vite. `vite build` output goes to the `eduline-web` bucket, served by the same load balancer and Cloud CDN at `/`. Remove Cloud Run "web".

**Why.** One fewer service to deploy, scale and pay for; static files are served from the CDN edge; the app is mostly behind login, so SSR/SEO adds little.

**Trade-offs.** No SSR (the public catalog page is not pre-rendered for search engines). Deep links (`/courses/1234`) must return `index.html`: configure the backend bucket's not-found page to `index.html`, or a URL-map rewrite.

**Needs:** M4 agreement; M5 adds a "build + upload to bucket" job instead of a container for the frontend.

---

## ADR-008: Access token in the Authorization header

**Decision.** `Authorization: Bearer <JWT>` (backend README change #20). No cookies.

**Why.** Works the same from browser, k6 and Postman; no CSRF protection needed; API stays stateless.

**Trade-off.** JavaScript can read the token, so an XSS bug could steal it. Mitigations: access token only in memory (15 min), React escaping, no `dangerouslySetInnerHTML` on user content, a strict Content-Security-Policy on the web bucket. Refresh token storage (memory = re-login on page reload, `localStorage` = survives reload but readable by XSS) is an M4 + M1 decision.

**Action.** FE removes `withCredentials: true` (integration-review #2).

---

## ADR-009: Cloud SQL access by identity (Auth Proxy + IAM), not by IP

Week 2/8 question: *how does the API reach the database, and who else can?*

**Context.** Cloud SQL `eduline-db` has a public IP. Cloud Run has no fixed outbound IP, and team laptops change networks.

| Option | How | Problem |
|---|---|---|
| Authorized networks (IP allow-list) | Open 5432 to listed IPs | Cloud Run IPs are not fixed, so the list would have to be `0.0.0.0/0`. Port 5432 exposed to the Internet; only the DB password protects it. |
| Private IP + VPC connector | DB only inside the VPC | Extra cost (Serverless VPC Access / Direct VPC egress setup), laptops need a bastion or VPN for migrations |
| **Auth Proxy + IAM (chosen)** | Authorized networks empty. Clients connect through the Cloud SQL connector, which checks IAM (`roles/cloudsql.client`) and opens an mTLS tunnel | Clients need the proxy (built into Cloud Run; one binary on laptops) |

**Decision.** Authorized networks stay empty. Cloud Run `api` uses `--add-cloudsql-instances` (Unix socket at `/cloudsql/<connection name>`); laptops use `cloud-sql-proxy`. Verified: `Test-NetConnection <public ip> -Port 5432` → `TcpTestSucceeded: False`.

**Defence in depth.** Three independent checks: network (no direct TCP), identity (IAM role on the caller's service account), database (user + password from Secret Manager).

**Runtime identity.** Cloud Run runs as `sa-api`, not the default Compute Engine service account (which has project-wide Editor). `sa-api` has only `cloudsql.client` (project) and `secretmanager.secretAccessor` on each secret it reads.

**Trade-offs.** The public IP still exists (not reachable, but visible); moving to private IP is a week 9/10 option if needed. Connection pool: `connection_limit` × Cloud Run `max-instances` must stay under the DB limit (5 × 3 = 15 for `db-f1-micro`).
