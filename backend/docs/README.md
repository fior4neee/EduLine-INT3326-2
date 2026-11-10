# Docs

Architecture, decisions, and review material. Code-level API shapes live in [`backend/README.md`](../backend/README.md).

| File | What it answers | Week | Owner |
|---|---|---|---|
| [architecture.md](architecture.md) | What are the components and how does data flow? (diagram: `architecture.drawio`, `architecture.png`) | 1 | M1 |
| [architecture-decisions.md](architecture-decisions.md) | Why GCP, monolith, PostgreSQL, CDN, async, Redis, SPA, header token? | 1–10 | M1 |
| [integration-review.md](integration-review.md) | Where do the README, schema, backend and frontend disagree, and who fixes it? | rolling | M1 |
| [rbac-matrix.md](rbac-matrix.md) | Who can call which endpoint, and the authorization test cases | 3–7 | M1, M2 |
| [storage-cdn-iam.md](storage-cdn-iam.md) | Buckets, object keys, upload/view flows, signed URL TTLs, service accounts | 4 | M1, M5, M6 |
| [quiz-submission-design.md](quiz-submission-design.md) | How quiz start/save/submit stay correct under concurrent load | 6 | M1, M2, M3 |
| [security-checklist.md](security-checklist.md) | Coding rules for every PR, and the week 8 review | 3–8 | M1 |
| [capacity-and-load-test.md](capacity-and-load-test.md) | DB connections vs Cloud Run instances, k6 scenarios, GCP credit plan | 9 | M1, M5 |
| [cloud-data-plan.md](cloud-data-plan.md) | How local data gets to Cloud SQL, files to Cloud Storage, and who runs the shared demo environment | 5–7 | M1, M6 |

## Diagrams

All editable in one file, [`diagrams.drawio`](diagrams.drawio) (one page per diagram). PNG exports:

| Diagram | Week | PNG |
|---|---|---|
| Architecture (components + 15 numbered arrows) | 1 | [architecture.png](architecture.png) · source `architecture.drawio` |
| Use cases (Student / Instructor / Admin) | 1 | [diagrams/use-cases.png](diagrams/use-cases.png) |
| ERD generated from `schema.prisma` (15 tables) | 1 | [diagrams/erd.png](diagrams/erd.png) |
| Deployment / network (regions, VPC, private IPs, service accounts) | 2–4 | [diagrams/deployment.png](diagrams/deployment.png) |
| Sequence 1: upload video/PDF with signed URL | 4 | [diagrams/seq-1-upload-media.png](diagrams/seq-1-upload-media.png) |
| Sequence 2: open lesson, enrollment check, CDN | 4 | [diagrams/seq-2-open-lesson.png](diagrams/seq-2-open-lesson.png) |
| Sequence 3: two concurrent quiz submits | 6 | [diagrams/seq-3-quiz-submit.png](diagrams/seq-3-quiz-submit.png) |
| Sequence 4: grade → outbox → Pub/Sub → worker → notification | 7 | [diagrams/seq-4-grade-notification.png](diagrams/seq-4-grade-notification.png) |

The ERD is a snapshot of `schema.prisma` on 2026-10-21; redraw it when the schema changes.

Edit any diagram in [app.diagrams.net](https://app.diagrams.net) (File → Open from → Device → the `.drawio` file), then File → Export as → PNG over the matching file.
