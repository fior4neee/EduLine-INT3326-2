# Storage, CDN and IAM Design (M1, Week 4)

Implements root README §5 (`/media/*` → backend bucket with Cloud CDN signed URLs) and backend README §3.5/§3.8 (keys in DB, signed URLs per request). M5 builds it, M6 writes the media service, M1 reviews against the tests in §6.

## 1. Buckets

All buckets: same region as Cloud Run and Cloud SQL (e.g. `asia-southeast1`), **uniform bucket-level access** on, no ACLs.

| Bucket | Holds | Public? | Served by | Notes |
|---|---|---|---|---|
| `eduline-web` | Vite build (`index.html`, hashed JS/CSS) | Yes, read-only (`allUsers: objectViewer`) | LB backend bucket + Cloud CDN | It is public code anyway. See ADR-007 |
| `eduline-media` | Lesson videos, PDFs, resources | **No**. Public access prevention **enforced** | LB backend bucket + Cloud CDN, **signed URLs required** | Read by the CDN fill service account only |
| `eduline-submissions` | Student assignment files | **No**. Public access prevention **enforced** | **Not behind CDN.** GCS V4 signed GET from the API | Private per student, no reason to cache at the edge |

## 2. Object keys

| Bucket | Key | Why |
|---|---|---|
| media | `courses/{courseId}/lessons/{lessonId}/{uuid}.{ext}` | **New upload = new key.** CDN never serves an old cached copy after an instructor replaces a video, so no cache invalidation is needed |
| submissions | `assignments/{assignmentId}/{userId}/{uuid}.{ext}` | Original file name goes to `Submission.fileName` only, never into the key (no path tricks, no odd characters) |
| web | as produced by `vite build` | `index.html`: `Cache-Control: no-cache`. `assets/*`: `public, max-age=31536000, immutable` (file names contain a hash) |

The **server generates every key**. The client never chooses a path.

## 3. Upload flow (instructor video / PDF, student submission)

| Step | Who | What |
|---|---|---|
| 1 | FE → API | `POST /lessons/:id/content/upload-url {fileName, contentType, sizeBytes}` |
| 2 | API | `AccessPolicy` check; size ≤ limit from `upload-limits.ts`; type allowlist (video: `video/mp4`, docs: `application/pdf`; submissions: `allowedExtensions`) |
| 3 | API | Generate key, sign a **V4 PUT** URL for that key, `Content-Type` included in the signature, **expiry 15 min** |
| 4 | Browser → GCS | `PUT` the bytes directly (API never sees the file) |
| 5 | FE → API | `POST …/complete {key}` |
| 6 | API | Read the object's metadata from GCS: exists, `size ≤ limit`, `contentType` matches; read the first bytes and check the file signature (`%PDF-` for PDF, `ftyp` box for MP4), because `contentType` is whatever the browser claimed. Fail → delete the object, 422. OK → write `Lesson.videoKey` / `resourceKeys` (or `Submission.fileKey`) |
| 7 | GCS → Pub/Sub | For PDFs: object-finalize notification → `ai-ingest` topic (M6) |

A signed PUT URL cannot enforce a maximum size by itself, which is why step 6 re-checks the real object size.

CORS (set on `eduline-media` and `eduline-submissions`, needed for the browser `PUT`):

```json
[{ "origin": ["https://<frontend-domain>", "http://localhost:5173"],
   "method": ["PUT", "GET", "HEAD"],
   "responseHeader": ["Content-Type"],
   "maxAgeSeconds": 3600 }]
```

## 4. Download / view flow

| Content | URL type | TTL | Reason |
|---|---|---|---|
| Lesson **video** | Cloud CDN signed URL | **2 hours** | The signature is validated on every request, cache hits included. A browser plays MP4 with many range requests over the whole session. A 10-minute URL breaks seeking and buffering mid-lesson |
| Lesson PDF / resource | Cloud CDN signed URL | 10 min | Downloaded in one go |
| Submission file | GCS V4 signed GET, `response-content-disposition=attachment` | 5 min | Forces download; a malicious HTML/SVG upload is never rendered in our origin |

- The CDN signing key is a 128-bit random key added to the `eduline-media` backend bucket; the API reads it from **Secret Manager** (`cdn-signing-key`).
- Grant the CDN read access to the private bucket: `service-<PROJECT_NUMBER>@cloud-cdn-fill.iam.gserviceaccount.com` → `roles/storage.objectViewer` on `eduline-media`. That account appears only after the first signing key is added.
- The API generates a **fresh** signed URL on each `GET /lessons/:id` (backend README). It is never stored.

## 5. Service accounts (least privilege)

One service account per workload. No JSON key files anywhere: Cloud Run uses its attached service account, GitHub Actions uses Workload Identity Federation.

Status as of 14/11/2026 (security review week 8, [security-review-week8.md](security-review-week8.md)): **granted** = exists on GCP now; *(planned)* = not granted yet because the feature is not built. Secret names are the real ones: the DB password lives inside the `database-url` secret (no separate `db-password`).

| Service account | Used by | Roles (scope) |
|---|---|---|
| `sa-api` | Cloud Run `api` | **Granted:** `cloudsql.client` (project) · `secretmanager.secretAccessor` on each of `database-url`, `jwt-secret`, `internal-api-token` only · `pubsub.publisher` on topic `notifications` only. *(Planned)*: `secretAccessor` on `cdn-signing-key` · `pubsub.publisher` on `ai-ingest`, `analytics` · `storage.objectAdmin` (buckets `eduline-media`, `eduline-submissions` only) · `iam.serviceAccountTokenCreator` **on itself** (needed to sign V4 URLs without a key file) · `aiplatform.user` (Gemini for AI tutor) |
| `sa-worker` | Cloud Run `worker` | **Granted:** `cloudsql.client` (project) · `secretmanager.secretAccessor` on `database-url` only. *(Planned)*: `secretAccessor` on `email-api-key` · `storage.objectViewer` (`eduline-media`, to read PDFs) · `aiplatform.user` (embeddings) |
| `sa-pubsub-push` | Pub/Sub push subscription `notifications-worker` | **Granted:** `run.invoker` on `worker` only. The Pub/Sub service agent has `iam.serviceAccountTokenCreator` on this SA (to mint the OIDC token) |
| `sa-deployer` | GitHub Actions (WIF) | *(Planned, M5)*: `run.developer` · `artifactregistry.writer` (repo `cloud-run-source-deploy` today; `eduline` planned) · `iam.serviceAccountUser` on `sa-api` and `sa-worker` |
| CDN fill SA (Google-managed) | Cloud CDN | *(Planned)*: `storage.objectViewer` on `eduline-media` |

Secrets nobody's runtime reads: `demo-admin-password` (cloud Admin password, D6) has **no** binding; only people with project-level Secret Manager access can read it. Cloud Scheduler sends `internal-api-token` as a header stored in the job config, not via IAM.

Today the Cloud Build step of `gcloud run deploy --source` runs as the default compute SA (which has project `Editor`); see review item #7.

Cloud Run network settings:
- `api`: ingress **internal and Cloud Load Balancing**, so nobody can bypass Cloud Armor through the `*.run.app` URL. *(Planned, M5; today ingress `all` + `allUsers`.)*
- `worker`: **no** `--allow-unauthenticated`; only `sa-pubsub-push` (OIDC token) can invoke it. **Done** (unauthenticated request → `403`, 14/11).

## 6. Week 4 security review checklist

| ID | Test | Expected |
|---|---|---|
| S01 | Student enrolled in Course A opens a lesson of A | 200 + working signed URL; video seeks fine after 15 min of playback |
| S02 | Student **not** enrolled in Course B opens a lesson of B | 403, no URL in the response |
| S03 | Copy S01's URL, change the object path to a Course B video | 403 from CDN (signature covers the path) |
| S04 | Use S01's URL after it expires | 403 |
| S05 | `https://storage.googleapis.com/eduline-media/<key>` without signature | 403 |
| S06 | Request the `api` service's `*.run.app` URL directly | 403/404 (ingress blocks it) |
| S07 | Upload 250 MB to a signed PUT URL meant for a 200 MB video | `/complete` returns 422, object deleted |
| S08 | Upload an `.exe` renamed to `.pdf` | Rejected at `/complete` (file signature is not `%PDF-`), object deleted |
| S09 | Student downloads another student's submission via `/submissions/:id/download-url` | 404 |
| S10 | Upload from an origin not in CORS | Browser blocks the `PUT` |
