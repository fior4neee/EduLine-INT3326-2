# Capacity, Load Test and Credit Plan (M1 + M5, Week 9)

Closes root README §16 open decision: *"Cloud SQL connection limit vs Cloud Run max-instances"*.

## 1. The connection budget

Cloud Run scales the API out to many instances. Each instance opens its own Prisma connection pool. If the instances together open more connections than Cloud SQL allows, new connections fail exactly at peak load, which is the quiz test we have to demo.

```
api.maxInstances × api.poolSize
+ worker.maxInstances × worker.poolSize
+ reserve (migrations, psql, Cloud SQL internal)          ≈ 5
≤ Cloud SQL max_connections
```

- Read the real limit after creating the instance: `SHOW max_connections;`. It depends on the machine type, and small shared-core tiers are low. It can be raised with the `max_connections` database flag if memory allows.
- Prisma pool size: set it explicitly in the URL, `DATABASE_URL=…?connection_limit=10&pool_timeout=10`. The default is based on CPU count (about 3 for a 1-vCPU instance), which is too small for 80 concurrent requests.
- Cloud Run defaults: concurrency 80 requests per instance, max instances 100. **Always set `--max-instances` explicitly**; 100 × 10 connections would exceed any small Cloud SQL tier.

### Starting values (to be tuned by the week 9 test)

| Setting | api | worker |
|---|---|---|
| CPU / memory | 1 vCPU / 512 MiB | 1 vCPU / 512 MiB |
| `--concurrency` | 80 | 10 (jobs are slower, call external APIs) |
| `--min-instances` | 0 normally, **1 during demo and load test** (no cold start) | 0 |
| `--max-instances` | 4 | 2 |
| `connection_limit` | 10 | 3 |
| DB connections used | 40 | 6 |
| Total with reserve | **≈ 51** → Cloud SQL tier must allow at least ~60 | |

Example rule: if `SHOW max_connections` returns 100, the API can go to `max-instances 8` with pool 10 (80 + 6 + 5 = 91).

Rough throughput check: a quiz submit is ~5 short queries (a few ms each). One instance with 10 connections can run 10 transactions at a time, so a few hundred submits per second per instance in theory. Bottlenecks will more likely be CPU (argon2 on login, JSON) or slow queries, which is what the test is for.

## 2. Load test scenarios (k6)

Test data (M2 seed script): 1 course, 1 quiz with 10 questions, **500 student accounts enrolled**.

Login is rate limited and argon2 is deliberately slow, so do **not** log in 500 users inside the test. Log them in during `setup()` (spread over time) or with a seed endpoint that only exists in the test environment, and pass the tokens to the virtual users.

| ID | Scenario | Flow per virtual user | Load profile | Pass criteria |
|---|---|---|---|---|
| L1 | Catalog read | `GET /courses` → `GET /courses/:id` | 50 → 200 VUs over 5 min | p95 < 300 ms, errors < 1 % |
| L1b | Same, cache ON vs OFF | as L1 | as L1, run twice | Report both p95 values (ADR-006) |
| L2 | **Quiz peak** (main demo) | start attempt → 10 × save answer (2–5 s think time) → submit → get result | ramp 50 → 100 → 500 VUs, hold 500 for 5 min | p95 submit < 1 s, errors < 1 %, **every attempt scored exactly once** |
| L3 | Lesson open | `GET /lessons/:id` (signed URL generation) | 200 VUs | p95 < 300 ms |
| L4 | Spike | 0 → 500 VUs in 30 s on L2 | | Shows cold starts and scale-out speed |

After L2, verify in SQL: `SELECT count(*) FROM quiz_attempts WHERE status='Submitted' AND score IS NULL` = 0, and no student has two `InProgress` attempts.

### What to record (fill in during week 9)

| Metric | Source | L2 @100 VUs | L2 @500 VUs before fix | L2 @500 VUs after fix |
|---|---|---|---|---|
| Throughput (req/s) | k6 | | | |
| Latency p50 / p95 / p99 | k6 | | | |
| Error rate | k6 | | | |
| API instance count | Cloud Run metrics | | | |
| API CPU / memory | Cloud Run metrics | | | |
| DB connections in use | Cloud SQL metrics | | | |
| DB CPU | Cloud SQL metrics | | | |
| Slowest queries | Cloud SQL Query Insights | | | |

## 3. Credit plan ($300 trial)

Resources that bill **per hour even when nobody uses them** are created only when needed and stopped between demos.

| Resource | Bills while idle? | Create in | Between demos |
|---|---|---|---|
| Cloud Run api / worker | No (with `min-instances 0`) | Week 3 (dev deploy) | Keep `min-instances 0` |
| Cloud Storage buckets | Storage only (small) | Week 4 | Keep |
| Pub/Sub | No (per message) | Week 7 | Keep |
| **Cloud SQL** | **Yes** (instance hours) | Week 3 | **Stop the instance** (`gcloud sql instances patch … --activation-policy=NEVER`); storage still bills |
| **External HTTPS LB + CDN** | **Yes** (forwarding rule, ~$18/month per root README) | Week 4 (needed for CDN signed URLs) | Keep from week 4; before that use GCS V4 signed URLs |
| **Memorystore Redis** | **Yes** (~$35/month minimum per root README) | Week 5 **only if** ADR-006 measurements justify it | Delete between demos |
| Vertex AI | Per request | Week 8 | Per-user rate limit |

Must do on day one of using GCP (M1):
1. Billing **budget with alerts at 50 % / 80 % / 100 %** of the credit, sent to M1 and M5.
2. Labels on every resource: `app=eduline`, `owner=<member>`, `env=dev|demo`, so the billing report shows what costs money.
3. Weekly check of the billing report in the Monday meeting (1 line in the progress slide).

Monthly estimates for 100 / 1,000 / 10,000 users are M5's week 10 cost analysis; the table above is only about not running out of credit before week 9.
