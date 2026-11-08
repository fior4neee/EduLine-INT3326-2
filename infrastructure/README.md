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

> Trạng thái 2026-11-09: project, API, Cloud SQL, Secret Manager, IAM đã xong. **Chưa deploy Cloud Run.**
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

### Việc tiếp theo

- [ ] Chạy migration lên Cloud SQL qua Auth Proxy (`npm run prisma:deploy`)
- [ ] Artifact Registry + deploy Cloud Run `api` với `sa-api`, secret và Cloud SQL connector
- [ ] Smoke test: `/api/v1/health` trả `200 {"status":"ok","database":"up"}`
- [ ] Pub/Sub topic + dead-letter topic cho worker (tuần 7)
