# Security review tuần 8: phần của M1

Ngày chạy: 14/11/2026. Người chạy: M1 (An). Phạm vi: các dòng **IAM, Logs, Budget** của [security-checklist.md §B](security-checklist.md#b-week-8-review-m1--m2--m5), cộng các phát hiện phụ trong lúc rà.
Cách làm: **chỉ đọc**. Không sửa IAM, không xóa key. Mọi lệnh chạy từ PowerShell với `$P = "gen-lang-client-0192726533"`.
Không ghi email cá nhân vào file này (repo public); principal là người được ghi theo vai trò.

## Tóm tắt

| Mức | Số mục | Nội dung chính |
|---|---|---|
| Cao | 2 | SA `fiorane-bigquery` có **Owner** và một **key JSON không hết hạn**; default compute SA có **Editor** |
| Trung bình | 3 | SA `annguyen1` (M1) dùng key JSON; `run/api` chưa sau Load Balancer; Cloud SQL tắt deletion protection |
| Thấp / ghi nhận | 6 | Token Scheduler đọc được từ cấu hình job; mật khẩu demo công khai; file export trong lịch sử git; budget chưa kiểm chứng được; `sslMode` cho phép không mã hóa; `backend/.env` lọt vào source upload của Cloud Run (đã sửa) |
| Đạt | 6 | `sa-api`, `sa-worker`, `sa-pubsub-push` least privilege; secret cấp từng cái; worker private; log sạch |

## Kết quả

| # | Check | Kết quả | Bằng chứng (lệnh) | Đề xuất | Ai sửa |
|---|---|---|---|---|---|
| 1 | `sa-api` khớp [storage-cdn-iam §5](storage-cdn-iam.md#5-service-accounts-least-privilege) | **Đạt** (phần đã triển khai). Có: `cloudsql.client` (project), `secretAccessor` trên **từng** secret `database-url`, `jwt-secret`, `internal-api-token`, `pubsub.publisher` **chỉ** topic `notifications`. Không có role thừa. Chưa có (vì tính năng chưa làm): storage, `cdn-signing-key`, `serviceAccountTokenCreator` trên chính nó, `aiplatform.user`, topic `ai-ingest`/`analytics` | `gcloud projects get-iam-policy $P --flatten="bindings[].members" --filter="bindings.members:sa-api@" --format="value(bindings.role)"`; `gcloud secrets get-iam-policy <secret>`; `gcloud pubsub topics get-iam-policy notifications` | Khi M6 xong 6.1: cấp `storage.objectAdmin` **trên từng bucket**, không ở project | M1 duyệt, M6 |
| 2 | `sa-worker` khớp §5 | **Đạt**. Có: `cloudsql.client` (project), `secretAccessor` **chỉ** `database-url`. Không có quyền Pub/Sub (push không cần), không key | Như trên với `sa-worker@`; `gcloud secrets get-iam-policy database-url` | Khi có email sender: thêm secret riêng, cấp riêng | M1 |
| 3 | `sa-pubsub-push` khớp §5 | **Đạt**. `run.invoker` **chỉ** trên service `worker`; Pub/Sub service agent có `serviceAccountTokenCreator` trên SA này (để mint OIDC) | `gcloud run services get-iam-policy worker --region asia-southeast1`; `gcloud iam service-accounts get-iam-policy sa-pubsub-push@$P.iam.gserviceaccount.com` | — | — |
| 4 | Worker private | **Đạt**. Không có `allUsers`; request không token → `403` (kiểm 14/11) | `gcloud run services get-iam-policy worker --region asia-southeast1` | — | — |
| 5 | Không SA nào có key | **Không đạt**. 2 key user-managed, hạn `9999-12-31`: `fiorane-bigquery` (tạo 25/04/2026) và `annguyen1` (tạo 08/11/2026). `sa-api`, `sa-worker`, `sa-pubsub-push`, compute SA: không có key | `foreach ($sa in (gcloud iam service-accounts list --format="value(email)")) { gcloud iam service-accounts keys list --iam-account $sa --managed-by=user }` | `fiorane-bigquery`: hỏi chủ sở hữu SA dùng vào việc gì; nếu không còn dùng thì **xóa key** (`gcloud iam service-accounts keys delete`), rồi disable SA. `annguyen1`: chuyển M1 sang đăng nhập bằng tài khoản người dùng (`gcloud auth login`) với các role đang cấp cho SA, rồi xóa key | Owner (Liêm), M1 |
| 6 | Không ai có Owner trừ project owner | **Không đạt**. Owner: 1 tài khoản người dùng (project owner) **và** SA `fiorane-bigquery` | `gcloud projects get-iam-policy $P --format=json` | Gỡ Owner khỏi `fiorane-bigquery`; nếu cần BigQuery thì cấp `bigquery.*` hẹp. Kết hợp với #5: SA có Owner + key JSON = ai giữ file key là toàn quyền project | Owner (Liêm) |
| 7 | Editor ở project | **Không đạt** (một phần). `roles/editor`: default compute SA `…-compute@developer` và `annguyen1`. **M1 đã tạo `sa-build` (14/11); Liêm có thể gỡ Editor khỏi compute SA.** Trước đó Cloud Build của `gcloud run deploy --source` chạy bằng compute SA (build `4f259231`, `fb98d761`); từ build `c1616632` (revision `api-00003-mjx`) chạy bằng `sa-build`, chỉ có 3 quyền: `artifactregistry.writer` trên repo `cloud-run-source-deploy`, `storage.objectViewer` trên bucket `run-sources-…`, `logging.logWriter` ở project. Không cần `cloudbuild.builds.builder` như dự kiến ban đầu: build thành công với 3 quyền trên. Ngoài Cloud Build không còn gì dùng compute SA (`api`/`worker` dùng SA riêng; worker build bằng `docker push` từ laptop; Scheduler dùng header token; Pub/Sub push dùng `sa-pubsub-push`; Cloud Functions/Compute Engine chưa bật) | `gcloud builds describe c1616632-64ba-498b-95d8-bec9b45630f5 --region asia-southeast1 --format="value(serviceAccount)"`; `gcloud run services list --region asia-southeast1 --format="table(metadata.name,spec.template.spec.serviceAccountName)"` | Liêm gỡ Editor khỏi compute SA (lệnh ở mục "Việc cần người khác"). Lệnh deploy trong `infrastructure/README.md` đã có `--build-service-account`; bỏ cờ này thì build quay lại compute SA và sẽ lỗi. Sau này `sa-deployer` (WIF) của M5 thay thế. `annguyen1`: thu hẹp khi chuyển sang tài khoản người dùng (#5); khi đó cấp `iam.serviceAccountUser` trên `sa-build` và `sa-api` | M1 (xong `sa-build`), Owner (Liêm) gỡ Editor |
| 8 | Role lạ ở project | **Ghi nhận**. `roles/admin` (title "Admin") cấp cho `annguyen1`, cùng `projectIamAdmin`, `secretmanager.admin`, `serviceUsageAdmin` | `gcloud iam roles describe roles/admin` | Xem lại có cần không; M1 chỉ cần các role cụ thể | Owner (Liêm), M1 |
| 9 | Logs không chứa `Bearer` / `password` / `Signature=` (7 ngày, `api` + `worker`) | **Đạt**. `Bearer`: 0. `Signature=`: 0. `password`: 50 dòng, **tất cả là tên route** (`Mapped {/api/v1/auth/forgot-password…}` lúc khởi động; URL `PATCH /api/v1/users/me/password`). Log HTTP chỉ có `method, route, status, userId, requestId, latencyMs`, không có body | Logging API `entries:list` với filter `resource.type="cloud_run_revision" AND (resource.labels.service_name="api" OR …="worker") AND timestamp>=<7 ngày> AND "<chuỗi>"` (gọi REST vì PowerShell 5.1 làm hỏng dấu `"` trong filter) | Lặp lại trước demo cuối | M1 |
| 10 | Budget alert 50/80/100 % | **Chưa kiểm chứng được**. `annguyen1` không có quyền trên billing account; Billing Budget API chưa bật | `gcloud billing budgets list --billing-account <id>` → permission denied | Liêm chụp màn hình trang Budgets & alerts, hoặc cấp `billing.viewer` cho M1 | **Cần người khác: Liêm** |
| 11 | Ingress `api` | **Chưa đạt thiết kế** (dòng của M5). `api`: ingress `all`, `allUsers` invoker; §5 yêu cầu `internal-and-cloud-load-balancing` sau Cloud Armor | `gcloud run services list --region asia-southeast1 --format="table(metadata.name,metadata.annotations.'run.googleapis.com/ingress')"` | Theo kế hoạch HTTPS LB + Cloud Armor | M5 |
| 12 | Token Cloud Scheduler | **Ghi nhận**. Header `X-Internal-Token` lưu trong cấu hình job `outbox-flush`, `assignment-reminders`; ai có quyền xem job (Viewer/Editor project) đọc được | `gcloud scheduler jobs describe outbox-flush --location asia-southeast1` | Chấp nhận cho dev. Tốt hơn: Scheduler gọi bằng OIDC token và API kiểm tra token (cần sửa `InternalTokenGuard`) | M2 (code), M1 |
| 13 | Mật khẩu Admin cloud (D6) | **Đạt**. Đổi sau import 14/11; `Admin#2026` → `401`. Mật khẩu mới chỉ nằm trong secret `demo-admin-password`, **không** cấp cho SA nào (policy rỗng) | `gcloud secrets get-iam-policy demo-admin-password` → không có binding | Đổi lại sau mỗi lần import; thêm version mới cho secret | M1 |
| 14 | Tài khoản demo khác | **Ghi nhận**. Giảng viên/học viên demo dùng mật khẩu công khai (`Instructor#2026`, `Student#2026` trong `seed-demo.ts`) trên API mở ra Internet | Đăng nhập thử | Chấp nhận cho demo (không có dữ liệu thật). Không tạo dữ liệu thật bằng các tài khoản này | — |
| 15 | File export trong lịch sử git | **Ghi nhận**. `infrastructure/eduline-data.sql` (commit `785196c7`) có email demo, hash argon2 và 10 dòng `refresh_tokens` (chỉ là hash sha256, không dùng lại được) | `git show 785196c7 --stat` | Xóa file khỏi `develop` (5.1, M2); không viết lại lịch sử. `*.sql`/`*.dump` đã vào `.gitignore` | M2 |
| 16 | Cloud SQL | **Ghi nhận**. Public IP nhưng authorized networks rỗng (chỉ vào qua Auth Proxy, IAM); `sslMode: ALLOW_UNENCRYPTED_AND_ENCRYPTED`; `deletionProtectionEnabled: false`; backup tự động bật 14/11 (7 bản) | `gcloud sql instances describe eduline-db --format="yaml(settings.ipConfiguration,settings.deletionProtectionEnabled,settings.backupConfiguration)"` | Bật deletion protection (`--deletion-protection`). `sslMode=ENCRYPTED_ONLY` không đổi gì thực tế vì không có kết nối trực tiếp, có thể bật cho đủ checklist | M1 |
| 17 | Source upload của `gcloud run deploy --source backend` | **Đã sửa 14/11, rủi ro thấp**. Trước đó `backend/` không có `.gcloudignore` nên upload 34 098 file / 491 MB, gồm `node_modules` và **`backend/.env`** (env local: DB `localhost`, JWT secret dev, mật khẩu seed Admin local). 2 zip trong `gs://run-sources-…-asia-southeast1/services/api/` (08/11 và 13/11, ~164 MB mỗi cái) nhiều khả năng chứa `.env`; bucket chỉ cho Owner/Editor/Viewer project đọc, không public. SHA-256 của `jwt-secret` (latest) **khác** `JWT_ACCESS_SECRET` trong `.env` local (so hash, không in giá trị), mật khẩu Admin cloud đã đổi (#13): `.env` không chứa secret nào đang dùng trên cloud, **không cần rotate**. Đã xử lý: thêm [`backend/.gcloudignore`](../.gcloudignore) (132 file / 0,8 MB, không còn `node_modules`/`.env`; build `--no-cache` từ đúng tập file này vẫn thành công) và xóa 2 zip (`gcloud storage rm`, bucket giờ rỗng). Bucket có soft delete 7 ngày nên 2 zip còn khôi phục được tới ~21/11, nhưng chỉ người có quyền project mới liệt kê/khôi phục được | `gcloud meta list-files-for-upload backend`; `gcloud storage ls -l gs://run-sources-<project>-asia-southeast1/services/api/` (rỗng); `gcloud storage ls --soft-deleted …` (2 object) | Trước mỗi lần deploy chạy `list-files-for-upload` | M1 (xong) |

## Việc cần người khác

| Ai | Việc | Vì sao |
|---|---|---|
| Liêm (Owner) | Gỡ Owner + xóa key của `fiorane-bigquery` (sau khi hỏi người tạo); gỡ Editor khỏi default compute SA (**sẵn sàng từ 14/11**: M1 đã chuyển Cloud Build sang `sa-build`, lệnh bên dưới) | Chỉ Owner/IAM admin được sửa; M1 chỉ đọc trong review này |
| Liêm | Xác nhận budget 50/80/100 % (ảnh chụp) hoặc cấp `billing.viewer` cho M1 | M1 không có quyền billing account |
| M5 | Ingress `api` sau Load Balancer + Cloud Armor | Thuộc dòng HTTPS/Ingress/Cloud Armor của M5 |

### Gỡ Editor khỏi default compute SA (Liêm)

```powershell
$P  = "gen-lang-client-0192726533"
$SA = "1050071283478-compute@developer.gserviceaccount.com"
# Trước: SA có những role gì (nếu còn role khác ngoài editor, báo M1 trước khi gỡ)
gcloud projects get-iam-policy $P --flatten="bindings[].members" --filter="bindings.members:serviceAccount:$SA" --format="value(bindings.role)"
gcloud projects remove-iam-policy-binding $P --member "serviceAccount:$SA" --role roles/editor
```

Kiểm tra sau khi gỡ (M1):

1. Lệnh đầu ở trên không còn `roles/editor`.
2. Deploy lại `api` một lần bằng đúng lệnh trong `infrastructure/README.md` (mục "Deploy lại", có `--build-service-account`). Build phải `SUCCESS` và `gcloud builds list --region asia-southeast1 --limit 1 --format="value(serviceAccount)"` là `sa-build`. Revision mới `Ready`; `/health` → `200` (hoặc `503 DATABASE_UNAVAILABLE` nếu Cloud SQL đang tắt).
3. Nếu build lỗi vì thiếu quyền: đọc lỗi trong `gcloud builds log <id> --region asia-southeast1`, cấp đúng quyền đó cho `sa-build` trên đúng tài nguyên; **không** cấp lại Editor.
