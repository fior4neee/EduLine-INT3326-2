# Infrastructure (M1 + M5)

## Local PostgreSQL (pgvector)
```bash
cd infrastructure
cp .env.example .env        # Windows: copy .env.example .env
docker compose up -d
docker compose ps           # chờ STATUS = healthy
```
Backend `.env`:
`DATABASE_URL=postgresql://eduline:eduline_dev@localhost:5432/eduline?schema=public`

Dừng: `docker compose down` (giữ dữ liệu) · Xoá sạch: `docker compose down -v`

Sau này: Terraform (GCP), k6 load test scripts.

## GCP dev environment (M1)

> Trạng thái 2026-11-09: project, API, Cloud SQL, Secret Manager, IAM, migration và Cloud Run `api` đã xong.
> API: `https://api-ziqtauotba-as.a.run.app/api/v1` (Swagger: `/api/docs`).
> Không bao giờ commit mật khẩu DB, giá trị secret hay file JSON key (`*-key.json` đã có trong `.gitignore`).

### Resource

| Thành phần | Giá trị | Ghi chú |
|---|---|---|
| Project | `gen-lang-client-0192726533` | Billing: free trial của nhóm (Liêm là Owner) |
| Region | `asia-southeast1` (Singapore) | Gần Việt Nam nhất, đủ dịch vụ |
| API đã bật | `run`, `sqladmin`, `secretmanager`, `artifactregistry`, `cloudbuild`, `iam`, `cloudbilling` | |
| Cloud SQL | `eduline-db`: PostgreSQL 16, Enterprise, `db-f1-micro`, 10 GB, không HA | Connection name: `gen-lang-client-0192726533:asia-southeast1:eduline-db` |
| Database / user | `eduline` / `eduline` | Mật khẩu chỉ nằm trong secret `database-url` |
| Secret | `database-url`, `jwt-secret` | Replication `automatic` |
| Service account runtime | `sa-api@gen-lang-client-0192726533.iam.gserviceaccount.com` | Danh tính của Cloud Run `api` |

### IAM (least privilege)

| Principal | Role | Phạm vi |
|---|---|---|
| `sa-api` | `roles/cloudsql.client` | Project |
| `sa-api` | `roles/secretmanager.secretAccessor` | **Từng secret** (`database-url`, `jwt-secret`), không cấp ở project |

Secret mới (ví dụ API key của worker) phải cấp quyền riêng cho đúng service account cần nó.

### Kết nối DB

Cloud SQL có public IP nhưng **authorized networks rỗng**: mọi kết nối TCP thẳng tới cổng 5432 đều bị chặn (`Test-NetConnection <ip> -Port 5432` → `False`).
Cách duy nhất vào DB là **Cloud SQL Auth Proxy**, xác thực bằng IAM (xem [ADR-009](../backend/docs/architecture-decisions.md#adr-009-cloud-sql-access-by-identity-auth-proxy--iam-not-by-ip)).

| Nơi chạy | Cách kết nối | `DATABASE_URL` |
|---|---|---|
| Cloud Run | `--add-cloudsql-instances <connection name>` → Unix socket | `...@localhost/eduline?host=/cloudsql/<connection name>&schema=public&connection_limit=5` |
| Laptop (migration, seed) | `cloud-sql-proxy <connection name> --port 5433` | `...@127.0.0.1:5433/eduline?schema=public` |

`connection_limit=5` × `--max-instances 3` = 15 kết nối, dưới giới hạn của `db-f1-micro`. Tăng max-instances thì phải tính lại.

### Tiết kiệm credit

Cloud SQL tính tiền liên tục khi bật, kể cả lúc không ai dùng. Tắt giữa các buổi demo:

```powershell
gcloud sql instances patch eduline-db --activation-policy=NEVER    # tắt
gcloud sql instances patch eduline-db --activation-policy=ALWAYS   # bật lại (~1-2 phút)
```

Budget alert 50/80/100% đặt ở billing account (Liêm quản lý). Alert **không tự chặn** chi tiêu.

### Kiểm tra trạng thái

```powershell
$P = "gen-lang-client-0192726533"
gcloud config list --format="value(core.account,core.project)"
gcloud sql instances describe eduline-db --format="value(state)"                  # RUNNABLE
gcloud sql databases list --instance=eduline-db --format="value(name)"           # có eduline
gcloud secrets list --format="value(name)"                                       # database-url, jwt-secret
gcloud projects get-iam-policy $P --flatten="bindings[].members" --filter="bindings.members:sa-api@" --format="value(bindings.role)"   # roles/cloudsql.client
gcloud secrets get-iam-policy database-url --format="value(bindings.role)"       # roles/secretmanager.secretAccessor
```

### Container image

`backend/Dockerfile` (multi-stage, `node:20-bookworm-slim`, chạy bằng user `node`, không chứa secret).

```powershell
docker build -t eduline-api:local backend
```

### Deploy lại

Chạy từ thư mục gốc repo:

```powershell
gcloud run deploy api --source backend --region asia-southeast1 `
  --service-account sa-api@gen-lang-client-0192726533.iam.gserviceaccount.com `
  --add-cloudsql-instances gen-lang-client-0192726533:asia-southeast1:eduline-db `
  --set-secrets "DATABASE_URL=database-url:latest,JWT_ACCESS_SECRET=jwt-secret:latest" `
  --set-env-vars "NODE_ENV=production,MAIL_TRANSPORT=outbox,CORS_ORIGINS=http://localhost:5173,FRONTEND_URL=http://localhost:5173" `
  --min-instances 0 --max-instances 3 --allow-unauthenticated --labels app=eduline
```

Migration mới: bật `cloud-sql-proxy <connection name> --port 5433 --gcloud-auth`, đặt `DATABASE_URL` trỏ `127.0.0.1:5433` rồi `npm run prisma:deploy` trong `backend/`.

### Pub/Sub (tuần 7)

| Resource | Cấu hình | Ghi chú |
|---|---|---|
| Topic `notifications` | | `sa-api` có `roles/pubsub.publisher` **chỉ trên topic này** |
| Subscription `notifications-worker` | **Push** tới `https://worker-ziqtauotba-as.a.run.app/pubsub/notifications`, OIDC bằng `sa-pubsub-push`, audience = worker URL; ack deadline 60 s, retry 10 s → 600 s, dead-letter sau **5** lần | Wrapped delivery. Pub/Sub service agent có `iam.serviceAccountTokenCreator` trên `sa-pubsub-push` để mint OIDC token. Xem mục Worker |
| Topic `notifications-dlq` | Dead-letter topic | Pub/Sub service agent có `pubsub.publisher` trên DLQ và `pubsub.subscriber` trên `notifications-worker` (bắt buộc để chuyển message lỗi) |
| Subscription `notifications-dlq-sub` | Pull, giữ 7 ngày | Topic không có subscription thì message bị **bỏ**, nên DLQ phải có subscription để giữ message lỗi lại mà điều tra |

Kiểm tra:

```powershell
gcloud pubsub topics publish notifications --message='{\"type\":\"TEST\",\"eventId\":\"t-1\"}'
gcloud pubsub subscriptions pull notifications-worker --auto-ack --limit=1
gcloud pubsub subscriptions pull notifications-dlq-sub --limit=5     # message lỗi (không ack)
```

PowerShell 5.1 bỏ dấu `"` khi truyền chuỗi cho chương trình ngoài, nên trong JSON phải viết `\"`.
Từ khi subscription là push, `pull notifications-worker` không còn nhận được message; publish message nghiệp vụ thật bằng REST (`Invoke-RestMethod` tới `pubsub.googleapis.com/v1/projects/$P/topics/notifications:publish`, `data` là base64) để tránh lỗi dấu `"`.

### Worker (Cloud Run `worker`, 7.1)

| Thành phần | Giá trị | Ghi chú |
|---|---|---|
| URL | `https://worker-ziqtauotba-as.a.run.app` | Endpoint push: `/pubsub/notifications`, health: `/health` |
| Image | `asia-southeast1-docker.pkg.dev/gen-lang-client-0192726533/cloud-run-source-deploy/worker:cf92de9` | Build từ root repo (`-f worker/Dockerfile`), không dùng `--source worker` vì worker import source backend |
| Runtime SA | `sa-worker@gen-lang-client-0192726533.iam.gserviceaccount.com` | `roles/cloudsql.client` (project) + `roles/secretmanager.secretAccessor` **chỉ trên `database-url`** |
| Ai gọi được | Chỉ `sa-pubsub-push` (`roles/run.invoker` **chỉ trên service `worker`**) | Private (`--no-allow-unauthenticated`), không có `allUsers`. Ranh giới xác thực là Cloud Run IAM, app không tự verify JWT |
| Giới hạn | `--concurrency 5`, `--min-instances 0`, `--max-instances 1`, timeout 60 s | Tổng kết nối DB: api 3 × 5 + worker 1 × 5 = **20**, dưới giới hạn `db-f1-micro`. Tăng max-instances bên nào cũng phải tính lại |

Deploy lại (chạy từ thư mục gốc repo):

```powershell
$P   = "gen-lang-client-0192726533"
$IMG = "asia-southeast1-docker.pkg.dev/${P}/cloud-run-source-deploy/worker:<git sha>"
docker build -f worker/Dockerfile -t $IMG .
docker push $IMG
gcloud run deploy worker --image $IMG --region asia-southeast1 `
  --service-account "sa-worker@${P}.iam.gserviceaccount.com" `
  --add-cloudsql-instances "${P}:asia-southeast1:eduline-db" `
  --set-secrets "DATABASE_URL=database-url:latest" `
  --set-env-vars "NODE_ENV=production" `
  --port 8080 --timeout 60 --concurrency 5 --min-instances 0 --max-instances 1 `
  --no-allow-unauthenticated --labels app=eduline
```

Kiểm chứng 2026-11-14: không token → `403`; `/health` có identity token → `200`; `COURSE_PUBLISHED` hợp lệ qua Pub/Sub → `204`; message `"hello"` → `400` × 5 (cách nhau ~12/15/21/22 s) rồi vào `notifications-dlq-sub` (`DeliveryCount=5`).

### Việc tiếp theo

- [x] Chạy migration lên Cloud SQL qua Auth Proxy (5 migration) và seed Admin (mật khẩu mạnh, không dùng giá trị trong `.env.example`)
- [x] Deploy Cloud Run `api` (`--source backend`, Artifact Registry `cloud-run-source-deploy`) với `sa-api`, secret và Cloud SQL connector
- [x] Smoke test: `/api/v1/health` → `200 {"status":"ok","database":"up"}`
- [x] RBAC trên cloud: `GET /admin/users` không token → `401`, Student → `403`, Admin → `200`
- [x] Pub/Sub topic + dead-letter topic (tuần 7), xem mục Pub/Sub
- [x] Deploy worker (M5/M6), chuyển `notifications-worker` sang push (OIDC, `sa-pubsub-push`), xem mục Worker
- [ ] API publish outbox event lên topic `notifications` thay vì tự xử lý trong process
