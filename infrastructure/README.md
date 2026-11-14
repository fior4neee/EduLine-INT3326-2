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
| API đã bật | `run`, `sqladmin`, `secretmanager`, `artifactregistry`, `cloudbuild`, `iam`, `cloudbilling`, `pubsub`, `cloudscheduler` | |
| Cloud SQL | `eduline-db`: PostgreSQL 16, Enterprise, `db-f1-micro`, 10 GB, không HA | Connection name: `gen-lang-client-0192726533:asia-southeast1:eduline-db` |
| Database / user | `eduline` / `eduline` | Mật khẩu chỉ nằm trong secret `database-url` |
| Secret | `database-url`, `jwt-secret`, `internal-api-token` | Replication `automatic`. `internal-api-token`: 64 ký tự base64url ngẫu nhiên, header `X-Internal-Token` cho `/internal/*` (Cloud Scheduler). `demo-admin-password`: mật khẩu Admin trên cloud (D6), **không** cấp cho service account nào, chỉ người có quyền project đọc |
| Service account runtime | `sa-api@gen-lang-client-0192726533.iam.gserviceaccount.com` | Danh tính của Cloud Run `api` |

### IAM (least privilege)

| Principal | Role | Phạm vi |
|---|---|---|
| `sa-api` | `roles/cloudsql.client` | Project |
| `sa-api` | `roles/secretmanager.secretAccessor` | **Từng secret** (`database-url`, `jwt-secret`, `internal-api-token`), không cấp ở project |
| `sa-build` (Cloud Build của `run deploy --source`) | `roles/artifactregistry.writer` | Chỉ repo `cloud-run-source-deploy` |
| `sa-build` | `roles/storage.objectViewer` | Chỉ bucket `run-sources-gen-lang-client-0192726533-asia-southeast1` (zip source) |
| `sa-build` | `roles/logging.logWriter` | Project (role này không cấp theo tài nguyên được); build dùng `CLOUD_LOGGING_ONLY` nên không cần logs bucket |

Secret mới (ví dụ API key của worker) phải cấp quyền riêng cho đúng service account cần nó.

### Kết nối DB

Cloud SQL có public IP nhưng **authorized networks rỗng**: mọi kết nối TCP thẳng tới cổng 5432 đều bị chặn (`Test-NetConnection <ip> -Port 5432` → `False`).
Cách duy nhất vào DB là **Cloud SQL Auth Proxy**, xác thực bằng IAM (xem [ADR-009](../backend/docs/architecture-decisions.md#adr-009-cloud-sql-access-by-identity-auth-proxy--iam-not-by-ip)).

| Nơi chạy | Cách kết nối | `DATABASE_URL` |
|---|---|---|
| Cloud Run | `--add-cloudsql-instances <connection name>` → Unix socket | `...@localhost/eduline?host=/cloudsql/<connection name>&schema=public&connection_limit=5` |
| Laptop (migration, seed) | `cloud-sql-proxy <connection name> --port 5433` | `...@127.0.0.1:5433/eduline?schema=public` |

`connection_limit=5` × `--max-instances 3` = 15 kết nối, dưới giới hạn của `db-f1-micro`. Tăng max-instances thì phải tính lại.

### Dữ liệu demo: export / import

Script chạy từ laptop Windows (PowerShell 5.1), không cần Cloud Shell. Chi tiết và các bước: [cloud-data-plan §4](../backend/docs/cloud-data-plan.md#4-quy-trình-import-script-54-chạy-từ-laptop-windows-powershell-51).

```powershell
powershell -ExecutionPolicy Bypass -File infrastructure\scripts\db-export.ps1                     # laptop -> Desktop (ngoài repo)
powershell -ExecutionPolicy Bypass -File infrastructure\scripts\db-import.ps1 -Database eduline_staging -File <file>
powershell -ExecutionPolicy Bypass -File infrastructure\scripts\db-import.ps1 -Database eduline -File <file>   # bắt gõ xác nhận
```

`db-import.ps1` tự backup, bật/tắt proxy, so migration, xóa và nạp trong một transaction, in số dòng và kiểm tra sequence. File dump (`*.sql`, `*.dump`) đã nằm trong `.gitignore`; xóa file sau khi import.

Database nháp `eduline_staging` (cùng instance, đã migrate) dùng để thử script. Kiểm tra khôi phục dùng instance tạm, xem [Kiểm tra khôi phục (7.5)](#kiểm-tra-khôi-phục-75).

### Tiết kiệm credit

Cloud SQL tính tiền liên tục khi bật, kể cả lúc không ai dùng. Tắt giữa các buổi demo:

```powershell
gcloud sql instances patch eduline-db --activation-policy=NEVER    # tắt
gcloud sql instances patch eduline-db --activation-policy=ALWAYS   # bật lại (~1-2 phút)
```

Budget alert 50/80/100% đặt ở billing account (Liêm quản lý). Alert **không tự chặn** chi tiêu.

### Runbook demo (7.4)

Ai trong nhóm cũng làm được, chỉ cần gcloud đã đăng nhập vào project. Chạy trong PowerShell, từ thư mục gốc repo.

**Bật**

```powershell
gcloud config set project gen-lang-client-0192726533
gcloud sql instances patch eduline-db --activation-policy=ALWAYS --async
gcloud sql instances describe eduline-db --format="value(state)"     # lặp lại tới khi RUNNABLE (~1-2 phút)
gcloud scheduler jobs resume outbox-flush --location asia-southeast1
gcloud scheduler jobs resume assignment-reminders --location asia-southeast1
Invoke-RestMethod https://api-ziqtauotba-as.a.run.app/api/v1/health  # {"status":"ok","database":"up"}
```

Lần gọi đầu có thể chậm vài giây (Cloud Run khởi động container). `503 DATABASE_UNAVAILABLE` ngay sau khi bật: chờ 30 s rồi gọi lại.

**Frontend và tài khoản demo**

```powershell
cd frontend; npm install; npx vite --mode cloud          # http://localhost:5173 (đúng cổng này, CORS chỉ cho phép nó)
```

| Vai trò | Đăng nhập | Mật khẩu |
|---|---|---|
| Admin | `admin` | Trong Secret Manager: `gcloud secrets versions access latest --secret demo-admin-password` (chỉ người có quyền project đọc được; không dán vào chat/slide) |
| Giảng viên | `minh.nguyen`, `anh.tran`, `bao.le`, `ha.pham` | `Instructor#2026` (mật khẩu demo công khai) |
| Học viên | `student.demo` | `Student#2026` (mật khẩu demo công khai) |

Kịch bản ngắn: học viên ghi danh khóa #12 → giảng viên `minh.nguyen` tạo + publish bài tập (nộp dạng text) → học viên nộp → giảng viên chấm → học viên thấy thông báo ở `/notifications` (vài giây, tối đa ~1 phút).

**Tắt (sau buổi demo, đừng quên)**

```powershell
gcloud scheduler jobs pause outbox-flush --location asia-southeast1
gcloud scheduler jobs pause assignment-reminders --location asia-southeast1
gcloud sql instances patch eduline-db --activation-policy=NEVER
gcloud sql instances describe eduline-db --format="value(state)"     # STOPPED
```

Pause Scheduler để khỏi đánh thức API mỗi phút chỉ để nhận `503` khi DB tắt. Quên resume thì thông báo vẫn đi (API tự poll khi đang có request), chỉ mất lưới an toàn.

**Lỗi thường gặp**

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| API trả trang lỗi 500/503 của Google, hoặc JSON `503 DATABASE_UNAVAILABLE` | Cloud SQL đang tắt hoặc đang khởi động (`MAINTENANCE`, `PENDING_CREATE`) | Chờ `RUNNABLE`; request tiếp theo tự kết nối lại |
| `409 another operation in progress` khi bật/tắt | Lệnh bật/tắt trước vẫn chạy (Ctrl+C không hủy được) | `gcloud sql operations list --instance eduline-db --filter="status!=DONE"` rồi `gcloud sql operations wait <id>` |
| Đăng nhập bị từ chối dù đúng mật khẩu | Tài khoản chỉ có ở DB local, hoặc dùng mật khẩu Admin cũ `Admin#2026` (đã đổi 14/11) | Dùng bảng tài khoản ở trên; Admin lấy từ secret |
| Trình duyệt báo lỗi CORS | Frontend không chạy ở `http://localhost:5173` | Tắt tiến trình đang giữ cổng 5173 rồi chạy lại |
| Upload video/file nộp bài trả `501` | Driver Cloud Storage (M6, 6.2) chưa xong | Demo bài tập dạng text |
| Không thấy thông báo | Worker lỗi hoặc message vào DLQ | `gcloud logging read "resource.labels.service_name=worker" --freshness=15m --limit 20`; `gcloud pubsub subscriptions pull notifications-dlq-sub --limit 5` |
| Terminal như bị treo sau khi bật proxy | Log của proxy in đè dấu nhắc | Ghi log proxy ra file (`-RedirectStandardOutput`), như các script |

**Kết quả C5 (14/11/2026, kịch bản ở trên chạy end-to-end trên cloud).** Frontend `--mode cloud`; DevTools xác nhận request đi tới `api-ziqtauotba-as.a.run.app`. Khóa #12, bài `asg_1` (hạn 14/11 18:00 giờ VN), `student.demo` nộp text, `minh.nguyen` chấm 85/100. Giờ UTC (giờ VN = UTC+7), revision `api-00002-rgm`:

| Event | Request ở `api` | Outbox → Pub/Sub (`outbox_events.published_at`) | `worker` (push từ Pub/Sub) | Dòng `notifications` (cho `student.demo`) |
|---|---|---|---|---|
| `ASSIGNMENT_PUBLISHED` `69983015…` | 02:42:46.0 `POST /assignments/:id/publish` 200 (req `a1fc43cc`) | 02:42:58.6, 0 lần lỗi | 02:43:00.5 `204` (cold start 3,2 s); 02:43:04.1 `handled, created: 1` | id 2, 02:43:04.1 |
| `ASSIGNMENT_DUE_SOON` `899a4f5d…` | 02:44:36.6 `POST /internal/jobs/assignment-reminders` 200 (chạy tay bằng `gcloud scheduler jobs run`) | 02:44:59.0 `OutboxProcessor warn`: commit quá timeout 15 s (20,4 s) **sau khi** đã publish → `attempts=1`; publish lại, 02:45:01.8 | 02:44:49.4 `204` `created: 1`; 02:45:01.7 `204` `created: 0` (bản trùng, bỏ qua theo `eventId`) | id 3, 02:44:49.5 (id 4 bị bỏ trống: lần insert trùng đã dùng mất một số của sequence) |
| `ASSIGNMENT_GRADED` `bad4cf67…` | 02:49:52.1 `PATCH /submissions/:id/grade` 200 (req `1cdb91cc`) | 02:49:59.1, 0 lần lỗi | 02:49:59.7 `204`; 02:49:59.8 `handled, created: 1` | id 5, 02:49:59.8 |

- `EventPublisher` không log khi publish thành công. Bằng chứng ở chặng này là `published_at` trong `outbox_events` cộng với message mà worker nhận (`messageId`). Lỗi publish thì `OutboxProcessor` có log `warn`.
- Học viên thấy cả 3 thông báo. Giảng viên không nhận được thông báo nào, vì lúc nộp bài không có event (đúng thiết kế). Đây là đề xuất cho M2 trong cloud-data-plan, mục 6 #7.
- Độ trễ từ request tới lúc có thông báo là 7–18 s. Lần commit quá timeout được ghi ở cloud-data-plan, mục 6 #8 (giả thuyết: CPU của `api` bị throttle giữa các request).
- Cách tra lại: `gcloud logging read 'resource.labels.service_name="worker" AND timestamp>="<UTC>"'`. Bảng `outbox_events` và `notifications` đọc qua proxy, ở chế độ chỉ đọc (`PGOPTIONS=-c default_transaction_read_only=on`).

### Kiểm tra khôi phục (7.5)

`gcloud sql backups restore` **ghi đè cả instance đích** (mọi database, user, mật khẩu). Không bao giờ dùng `eduline-db` làm đích. Restore vào một instance tạm, so số dòng, xóa instance tạm.

```powershell
# 1. Backup mới (ghi lại ID)
gcloud sql backups create --instance eduline-db --description "restore test <ngày>"
gcloud sql backups list --instance eduline-db --limit 1 --format="table(id,status,description)"

# 2. Instance tạm: cùng region/version/edition, đĩa >= đĩa nguồn (10 GB), không authorized networks
gcloud sql instances create eduline-restore-tmp --database-version POSTGRES_16 --region asia-southeast1 `
  --edition enterprise --tier db-f1-micro --storage-type SSD --storage-size 10 --availability-type zonal `
  --no-backup --no-deletion-protection --labels app=eduline,purpose=restore-test

# 3. Restore (hỏi xác nhận: kiểm tra đích là eduline-restore-tmp)
gcloud sql backups restore <BACKUP_ID> --restore-instance eduline-restore-tmp --backup-instance eduline-db

# 4. So số dòng mọi bảng schema public: 2 proxy (5433 -> eduline-db, 5435 -> eduline-restore-tmp),
#    user/mật khẩu lấy từ secret database-url (restore chép cả user), psql trong container postgres:16:
#    select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I',
#      table_schema, table_name), false, true, '')))[1]::text
#    from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1;

# 5. Xóa instance tạm và kiểm tra
gcloud sql instances delete eduline-restore-tmp
gcloud sql instances list        # chỉ còn eduline-db
```

Lần chạy 14/11 (backup `1794611988787`, "restore test E 20261114-061945", tạo sau import dữ liệu demo):

| Bước | Thời gian thực tế |
|---|---|
| Backup on-demand | 96 s (23:19:48 → 23:21:09 UTC) |
| Tạo instance tạm | ~10 phút 35 s (23:25:44 → 23:36:19 UTC) |
| Restore (`RESTORE_VOLUME`) | ~6 phút 36 s (01:30:47 → 01:37:23 UTC) |
| Kết quả | Database `eduline`: **21/21 bảng khớp**, 269 dòng (gồm `_prisma_migrations` 5, `courses` 13, `users` 6, `enrollments` 2, `notifications` 1, `outbox_events` 2) |
| Dọn dẹp | Đã xóa instance tạm; `instances list` chỉ còn `eduline-db` |

Ghi chú: lần này label `app/purpose` không được áp vào instance tạm (`userLabels` trống); không ảnh hưởng vì instance đã xóa. Chi phí: instance f1-micro chạy ~2,5 giờ, dưới $0.05.

### Kiểm tra trạng thái

```powershell
$P = "gen-lang-client-0192726533"
gcloud config list --format="value(core.account,core.project)"
gcloud sql instances describe eduline-db --format="value(state)"                  # RUNNABLE
gcloud sql databases list --instance=eduline-db --format="value(name)"           # có eduline
gcloud secrets list --format="value(name)"                                       # database-url, demo-admin-password, internal-api-token, jwt-secret
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
  --set-secrets "DATABASE_URL=database-url:latest,JWT_ACCESS_SECRET=jwt-secret:latest,INTERNAL_API_TOKEN=internal-api-token:latest" `
  --set-env-vars "NODE_ENV=production,MAIL_TRANSPORT=outbox,CORS_ORIGINS=http://localhost:5173,FRONTEND_URL=http://localhost:5173,PUBSUB_TOPIC=notifications" `
  --min-instances 0 --max-instances 3 --allow-unauthenticated --labels app=eduline `
  --build-service-account projects/gen-lang-client-0192726533/serviceAccounts/sa-build@gen-lang-client-0192726533.iam.gserviceaccount.com
```

- `PUBSUB_TOPIC=notifications`: API publish mọi outbox event lên topic, worker tạo notification. Bỏ biến này thì API tự tạo notification trong process (chỉ dùng ở local).
- `INTERNAL_API_TOKEN`: bật các route `/internal/*` cho Cloud Scheduler. Thiếu biến này các route đó trả `404`.
- `--build-service-account`: Cloud Build chạy bằng `sa-build` (chỉ đọc zip source, đẩy image, ghi log), không dùng default compute SA (có `roles/editor`). **Bỏ cờ này thì build quay lại compute SA**, và sẽ lỗi sau khi Editor bị gỡ khỏi SA đó. Người deploy cần quyền `actAs` trên `sa-build` và `sa-api` (hiện có qua `roles/editor` của `annguyen1`; khi thu hẹp thì cấp `roles/iam.serviceAccountUser` trên từng SA).
- Lần deploy 2026-11-14 bằng `sa-build` (build `c1616632`, revision `api-00003-mjx`): zip source 254 KB, không có `.env`/`node_modules`; env, secret, SA, Cloud SQL giống hệt `api-00002-rgm`.
- `backend/.gcloudignore` (thêm 14/11) loại `node_modules`, `dist`, `.env*`, test, docs khỏi upload: 132 file / 0,8 MB thay vì ~500 MB. Kiểm tra trước khi deploy: `gcloud meta list-files-for-upload backend` không được có `.env` hay `node_modules`. Hai lần deploy trước 14/11 đã upload cả `backend/.env` (xem security-review-week8 #17).
- Lần deploy 2026-11-14 (revision `api-00002-rgm`): `/health` → `200`, log có `Outbox events go to Pub/Sub topic "notifications"`.

#### Quy tắc migration (D7): migrate **trước**, deploy **sau**

API mới truy vấn cột/bảng của migration mới; deploy trước khi migrate thì API lỗi ngay. Mỗi lần merge có thư mục mới trong `backend/prisma/migrations`:

```powershell
# 0. So sánh: repo có migration nào Cloud SQL chưa có?
Get-ChildItem backend\prisma\migrations -Directory | ForEach-Object Name

# 1. Proxy riêng (cổng 5434 để không đụng proxy khác), log ra file
$proxy = Start-Process cloud-sql-proxy -ArgumentList "gen-lang-client-0192726533:asia-southeast1:eduline-db","--port","5434","--gcloud-auth" `
  -RedirectStandardOutput "$env:TEMP\proxy-migrate.log" -RedirectStandardError "$env:TEMP\proxy-migrate.err.log" -WindowStyle Hidden -PassThru

# 2. DATABASE_URL từ secret, đổi host sang proxy, bỏ tham số Cloud Run; không in ra
$u = (gcloud secrets versions access latest --secret database-url | Out-String).Trim()
$env:DATABASE_URL = $u -replace '@localhost/eduline\?.*$', '@127.0.0.1:5434/eduline?schema=public&connection_limit=1'; Remove-Variable u
Push-Location backend
npx prisma migrate deploy          # dòng "Datasource" phải là 127.0.0.1:5434, database "eduline"
Pop-Location

# 3. Dọn NGAY: nếu không, mọi lệnh prisma/npm sau đó trong terminal này trỏ vào Cloud SQL
Remove-Item Env:DATABASE_URL; Stop-Process -Id $proxy.Id

# 4. Rồi mới deploy API (lệnh ở trên), kiểm tra /health
```

Migration phải tương thích ngược với bản API đang chạy (thêm cột/bảng, không xóa/đổi tên trong cùng lần), vì giữa bước 2 và 4 bản cũ vẫn phục vụ request. Database `eduline_staging` cũng cần migrate (đổi tên database ở bước 2) nếu còn dùng nó. Sau này M5 đưa bước này vào CI.

### Cloud Scheduler (tuần 7)

| Job | Lịch | Gọi | Ghi chú |
|---|---|---|---|
| `outbox-flush` | `* * * * *` | `POST /api/v1/internal/outbox/flush` | Lưới an toàn: dọn outbox event còn `pending` |
| `assignment-reminders` | `*/15 * * * *` | `POST /api/v1/internal/jobs/assignment-reminders` | Nhắc hạn nộp bài |

Cả hai ở `asia-southeast1`, time zone `Asia/Ho_Chi_Minh`, attempt deadline 60 s, header `X-Internal-Token` = giá trị secret `internal-api-token`.

Vì sao cần Scheduler dù API có vòng poll outbox 2 s (`OUTBOX_POLL_INTERVAL_MS`): với `--min-instances 0`, Cloud Run chỉ cấp CPU khi đang xử lý request và thu instance về 0 khi hết traffic, nên timer trong process không đáng tin. Event publish lỗi hoặc ghi ngay trước khi instance dừng sẽ nằm `pending` tới khi có request kế tiếp. Scheduler đánh thức API mỗi phút để dọn chúng.

Tạo job (giá trị token chỉ nằm trong biến, không in ra):

```powershell
$tok = gcloud secrets versions access latest --secret internal-api-token
gcloud scheduler jobs create http outbox-flush --location asia-southeast1 `
  --schedule "* * * * *" --time-zone "Asia/Ho_Chi_Minh" `
  --uri "https://api-ziqtauotba-as.a.run.app/api/v1/internal/outbox/flush" --http-method POST `
  --headers "X-Internal-Token=$tok" --attempt-deadline 60s
gcloud scheduler jobs create http assignment-reminders --location asia-southeast1 `
  --schedule "*/15 * * * *" --time-zone "Asia/Ho_Chi_Minh" `
  --uri "https://api-ziqtauotba-as.a.run.app/api/v1/internal/jobs/assignment-reminders" --http-method POST `
  --headers "X-Internal-Token=$tok" --attempt-deadline 60s
Remove-Variable tok
```

Header lưu trong cấu hình job: ai có quyền xem job (Viewer/Editor của project) đọc được token. Đổi token: thêm version mới cho secret, deploy lại API, rồi `gcloud scheduler jobs update http <job> --update-headers "X-Internal-Token=$tok"`.

Kiểm chứng 2026-11-14: Scheduler gọi `flush` và `assignment-reminders` → `200` (user agent `Google-Cloud-Scheduler`); gọi không header hoặc sai token → `401`.

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
- [x] API publish outbox event lên topic `notifications` thay vì tự xử lý trong process (`PUBSUB_TOPIC`, secret `internal-api-token`, Scheduler `outbox-flush`)
