# Kế hoạch dữ liệu trên cloud: một database dùng chung cho cả nhóm

Người phụ trách: **M1 (An)** và **M6 (Hưng)**. M2 (Liêm) viết ngày 11/11/2026. Tuần 5–7 trong roadmap.

Tài liệu liên quan: [infrastructure/README.md](../../infrastructure/README.md) (tài nguyên GCP, Auth Proxy, deploy), [storage-cdn-iam.md](storage-cdn-iam.md) (bucket, signed URL), [integration-review.md](integration-review.md) (#10, #15, #16, #22, #24), [ADR-009](architecture-decisions.md#adr-009-cloud-sql-access-by-identity-auth-proxy--iam-not-by-ip) (vào DB qua Auth Proxy).

---

**Mục tiêu:** hết tuần 7, mọi thành viên chạy frontend bằng `npm run dev:cloud` và thấy **cùng** người dùng, khóa học, enrollment, tiến độ và thông báo từ Cloud SQL. File bài học nằm trên Cloud Storage. Việc đưa dữ liệu lên cloud là một script đã kiểm thử, không phải gõ tay trong Cloud Shell.

Hiện tại mỗi laptop có database riêng, nên việc làm trên máy này (ghi danh, chấm bài) không thấy được trên máy khác. API trên cloud chạy được, nhưng database trên cloud chỉ có tài khoản Admin.

## 1. Hiện trạng (11/11/2026)

| Mục | Trạng thái |
|---|---|
| Cloud Run `api` | Đã deploy. Trả lời khi Cloud SQL đang bật. CORS cho phép `http://localhost:5173` |
| Cloud SQL `eduline-db` | Đã chạy 5 migration (đến `20261109000000_assignments_phase2`). Dữ liệu: chỉ có Admin. Tắt giữa các buổi để tiết kiệm credit |
| Frontend | `npm run dev:cloud` gọi API trên Cloud Run ([`frontend/.env.cloud`](../../frontend/.env.cloud)). `npm run dev` vẫn dùng backend local |
| Database local | Mỗi laptop một cái, không dùng chung. Laptop của M2: 6 user, 13 khóa học, 2 enrollment, 10 dòng tiến độ. Một laptop khác có 4 enrollment |
| API khi Cloud SQL tắt | Bản đang chạy trên cloud bị crash lúc khởi động (`P1001 Can't reach database server`), Cloud Run trả trang lỗi 500/503 của Google. **M2 đã sửa trong code ngày 11/11** (5.7), có hiệu lực sau lần deploy tới |
| File | **Chưa có file nào cần chuyển.** Video đang phát video mẫu. Ảnh bìa khóa học là file tĩnh của frontend (`/images/courses/…`). API upload đã xong (M2, 11/11) nhưng trên cloud chỉ hoạt động khi M6 viết xong driver Cloud Storage |
| `infrastructure/eduline-data.sql` | Bản export local **đã commit lên repo public** ở `785196c7`. Chỉ có tài khoản demo với mật khẩu vốn đã công khai, nên rủi ro thấp. Giữ lại tới khi import xong rồi xóa (5.1) |

Vậy "đưa toàn bộ dữ liệu local lên cloud" lúc này là **copy database**, cộng với **dựng Cloud Storage** cho các file sẽ có khi bắt đầu upload.

## 2. Quyết định (đề xuất; M1 xác nhận)

| # | Quyết định | Lý do |
|---|---|---|
| D1 | **Cloud SQL là database demo dùng chung của nhóm.** Database local chỉ để phát triển và chạy test (`eduline_test`). | Một chỗ duy nhất giữ dữ liệu demo. |
| D2 | **Import dữ liệu của một laptop, một lần. Không gộp hai laptop.** M2 chọn bản export nào. | Cả hai laptop đều đánh số khóa học, enrollment, bài học từ 1, 2, 3…, gộp lại sẽ trùng ID. |
| D3 | **Sau khi import, cloud là nguồn dữ liệu chính.** Dữ liệu demo chỉ tạo trên cloud. Import lần hai sẽ xóa sạch nó. | Tránh mất công việc đã làm trên cloud. |
| D4 | **File export không bao giờ đưa vào git**, và bỏ phiên đăng nhập: `refresh_tokens`, `password_reset_tokens`. | File export chứa email và hash mật khẩu; phiên cũ không nên mang theo. |
| D5 | **Chỉ M1 chạy import**, và báo trong nhóm trước. | Import xóa sạch các bảng trên cloud trước khi nạp. |
| D6 | **Đổi mật khẩu Admin ngay sau mỗi lần import.** | Admin local dùng mật khẩu mặc định công khai `Admin#2026`, còn API cloud mở ra internet. |
| D7 | **Migration mới phải chạy lên Cloud SQL trước khi deploy API cần nó.** | Nếu không, API vừa deploy sẽ truy vấn cột chưa tồn tại. |

## 3. Kế hoạch theo tuần

### Tuần 5: một database dùng chung (M1 chính, M2 hỗ trợ)

| # | Việc | Người làm | Trạng thái | Xong khi |
|---|---|---|---|---|
| 5.1 | Xóa `infrastructure/eduline-data.sql` khỏi repo (`git rm`) **sau khi import xong (5.5)**. Thêm mẫu file dump vào `.gitignore` (`*.sql`, `*.dump`, trừ `backend/prisma/migrations/**`). | M2 | Chờ 5.5 | File không còn trên `develop`; `git check-ignore` khớp với một file dump mới |
| 5.2 | Cấp quyền cho M6 (và M2) vào DB qua Auth Proxy: `roles/cloudsql.client` ở project và `roles/secretmanager.secretAccessor` **chỉ trên** secret `database-url`. | M1 | Chưa làm | M6 chạy được `psql … -c "select 1"` qua proxy trong Cloud Shell |
| 5.3 | Bật **backup tự động hằng ngày** cho `eduline-db` (giữ 7 bản). | M1 | Chưa làm | `gcloud sql instances describe eduline-db --format="value(settings.backupConfiguration.enabled)"` in ra `True` |
| 5.4 | Viết hai script từ quy trình ở §4: `infrastructure/scripts/db-export.ps1` (laptop: `pg_dump` từ container Docker, lưu **ngoài repo**) và `infrastructure/scripts/db-import.sh` (Cloud Shell: so migration, tạo backup, xóa bảng, nạp trong một transaction, in số dòng). | M1 | Chưa làm | Cả hai script chạy trọn vẹn trên một database nháp `eduline_staging` cùng instance |
| 5.5 | Import bản export của M2 vào database thật. Đổi mật khẩu Admin. | M1, cùng M2 | Chưa làm | `GET /courses` trên cloud trả đúng `total`; hai laptop chạy `dev:cloud` thấy cùng enrollment |
| 5.6 | Ghi quy tắc "migration mới" vào phần deploy của `infrastructure/README.md`: `prisma migrate deploy` qua proxy, **rồi mới** `gcloud run deploy`. | M1 | Chưa làm | README đã cập nhật |
| 5.7 | API không được crash khi lúc khởi động không kết nối được DB: kết nối lại sau, và `/health` trả JSON `503 DATABASE_UNAVAILABLE`. | M2 | **Xong 11/11** | Thay đổi 64 trong backend README. Có hiệu lực trên cloud sau lần deploy tới |

### Tuần 6: file trên Cloud Storage (M6 chính, M1 duyệt IAM)

| # | Việc | Người làm | Trạng thái | Xong khi |
|---|---|---|---|---|
| 6.1 | Tạo bucket theo [storage-cdn-iam.md](storage-cdn-iam.md): một bucket media và một bucket submissions **riêng tư**. Cấp cho `sa-api` đúng quyền cần, trên từng bucket riêng. | M6, M1 duyệt | Chưa làm | Bucket đã có; `sa-api` không liệt kê được bucket khác |
| 6.2 | Lưu trữ media: signed URL để upload (PUT) và để xem (GET), giới hạn dung lượng theo `upload-limits.ts` (video 200 MB, file khác 100 MB). Link xem video sống **≥ 2 giờ** (integration-review #10). | M2 làm API, **M6 làm driver Cloud Storage** | **Phần M2 xong 11/11.** Còn phần M6 | Giảng viên upload video trên cloud và học viên đã ghi danh xem được. M2 đã làm: endpoint, kiểm tra file, signed link và driver `local` chạy trên laptop (thay đổi 65–66 trong backend README). **M6:** viết `src/common/storage/gcs-storage.driver.ts` (trong file đã ghi rõ từng hàm phải làm gì) |
| 6.3 | Media demo: upload vài video và PDF thật cho các khóa học seed, và một script gán `videoKey` / `resourceKeys` cho các bài học đó trên Cloud SQL. | M6 | Chưa làm | Bài học demo trên cloud phát từ Cloud Storage, không còn video mẫu |
| 6.4 | File nộp bài (M2 phase 3) dùng bucket submissions riêng tư. | M2 làm API, M6 làm lưu trữ | **Phần M2 xong 11/11** (thay đổi 67) | Học viên upload một file `.pdf`; giảng viên tải về qua signed URL. Chạy trên cloud khi driver gcs xong |
| 6.5 | Tùy chọn: `fake-gcs-server` trong `infrastructure/docker-compose.yml` để thử driver gcs mà không cần GCP (integration-review #16). | M6 | Chưa làm | Thử được driver gcs trên laptop |

Ảnh bìa khóa học để nguyên trong `frontend/public/images`, không cần chuyển.

### Tuần 7: xử lý bất đồng bộ trên cloud, và giữ hệ thống chạy ổn (M1 + M6)

| # | Việc | Người làm | Trạng thái | Xong khi |
|---|---|---|---|---|
| 7.1 | Deploy worker lên Cloud Run và chuyển subscription `notifications-worker` sang push (OIDC với `sa-pubsub-push`), như checklist trong `infrastructure/README.md`. | M6, M5 deploy | Chưa làm | Message thử đến được worker; message lỗi vào `notifications-dlq` |
| 7.2 | API gửi outbox event lên Pub/Sub thay vì tự xử lý trong process (integration-review #22). | M2 code, M1 duyệt | **Code xong 11/11** (thay đổi 68). **M1:** thêm `PUBSUB_TOPIC=notifications` vào `--set-env-vars` ở lần deploy tới (`sa-api` đã có quyền publisher trên topic này) | Chấm bài trên cloud tạo thông báo cho học viên qua worker. **Lưu ý:** từ lúc deploy với `PUBSUB_TOPIC`, thông báo trên cloud chỉ xuất hiện khi worker (7.1) đã đọc topic |
| 7.3 | Extension `vector` trên Cloud SQL dưới dạng migration Prisma (integration-review #15, #24), trước migration `document_chunks` của M6. | M6 viết, M1 chạy | Chưa làm | `select * from pg_extension where extname='vector'` trả về một dòng trên Cloud SQL |
| 7.4 | **Runbook demo** một trang trong `infrastructure/README.md`: bật Cloud SQL, chờ `RUNNABLE`, mở `/health`, đăng nhập bằng tài khoản demo, tắt Cloud SQL sau buổi demo. | M1 | Chưa làm | Bất kỳ thành viên nào cũng tự bật được demo |
| 7.5 | Kiểm tra khôi phục: restore bản backup mới nhất vào `eduline_staging` và so số dòng với database thật. | M1 | Chưa làm | Số dòng khớp; lệnh restore có trong runbook |

## 4. Quy trình import (M2 đã chạy thử bằng tay; làm cơ sở cho script ở 5.4)

**Trên laptop có dữ liệu (PowerShell):**

```powershell
docker exec eduline-postgres pg_dump -U eduline -d eduline --data-only --no-owner --no-privileges `
  --exclude-table=_prisma_migrations --exclude-table=refresh_tokens --exclude-table=password_reset_tokens `
  -f /tmp/eduline-data.sql
docker cp eduline-postgres:/tmp/eduline-data.sql "$HOME\Desktop\eduline-data.sql"   # ngoài repo
docker exec eduline-postgres psql -U eduline -d eduline -tAc "select migration_name from _prisma_migrations order by 1"
```

File được ghi trong container rồi copy ra, vì dấu `>` của PowerShell 5.1 lưu file dạng UTF-16 mà `psql` không đọc được.

**Trong Cloud Shell**, sau khi upload file (⋮ → Upload):

```bash
gcloud config set project gen-lang-client-0192726533
gcloud sql instances describe eduline-db --format="value(state)"       # phải là RUNNABLE
gcloud sql backups create --instance=eduline-db --description="before import"

curl -sLo cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.linux.amd64 && chmod +x cloud-sql-proxy
./cloud-sql-proxy gen-lang-client-0192726533:asia-southeast1:eduline-db --port 5433 > proxy.log 2>&1 &
DB_URL=$(gcloud secrets versions access latest --secret=database-url \
  | sed -E 's#@localhost/#@127.0.0.1:5433/#; s#host=/cloudsql/[^&]*&?##')
PGURL="${DB_URL%%\?*}"            # psql không nhận các tham số riêng của Prisma

# 1. Danh sách migration phải giống hệt trên laptop
psql "$PGURL" -tAc "select migration_name from _prisma_migrations order by 1"

# 2. Xóa dữ liệu mọi bảng, trừ lịch sử migration
psql "$PGURL" -v ON_ERROR_STOP=1 -c "DO \$\$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' LOOP
    EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', r.tablename);
  END LOOP; END \$\$;"

# 3. Nạp trong một transaction (được hết hoặc không gì cả), rồi kiểm tra số dòng
psql "$PGURL" -v ON_ERROR_STOP=1 --single-transaction -f ~/eduline-data.sql
psql "$PGURL" -c "select (select count(*) from users) users, (select count(*) from courses) courses, (select count(*) from enrollments) enrollments"

kill %1 && rm ~/eduline-data.sql
```

Các lỗi M2 đã gặp, script cần xử lý:

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Terminal như bị treo sau khi bật proxy | Log của proxy in đè lên dấu nhắc lệnh | Ghi log proxy ra `proxy.log` |
| API trả trang lỗi 500/503 của Google | Cloud SQL đang tắt hoặc đang khởi động (`MAINTENANCE`) | Chờ `RUNNABLE`; request tiếp theo sẽ khởi động container mới |
| `409 another operation in progress` | Lệnh bật/tắt trước đó vẫn đang chạy (Ctrl+C không hủy được nó) | `gcloud sql operations wait <id>` |
| Đăng nhập trên cloud bị từ chối dù đúng mật khẩu | Tài khoản chỉ có trong database local | Import hoặc seed lên cloud trước |

## 5. Ai làm gì

| Thành viên | Tuần 5–7 |
|---|---|
| M1 | Cấp quyền (5.2), backup (5.3), script và import (5.4–5.5), quy tắc migration (5.6), duyệt IAM (6.1), thêm `PUBSUB_TOPIC` khi deploy (7.2), runbook và kiểm tra khôi phục (7.4–7.5) |
| M6 | Bucket và driver Cloud Storage (6.1–6.3), giả lập storage local (6.5), worker (7.1), pgvector (7.3) |
| M2 | Xóa file export đã commit (5.1), chọn bản export để import, sửa lỗi khởi động API (5.7 ✓), API upload (6.2 ✓, 6.4 ✓), outbox → Pub/Sub (7.2 ✓), giao diện upload trên frontend (cùng M4) |
| M5 | Deploy worker (7.1); sau này thêm bước CI chạy migration (D7) |

## 6. Rủi ro và câu hỏi còn mở

| # | Vấn đề | Đề xuất | Ai quyết |
|---|---|---|---|
| 1 | Import dữ liệu của laptop nào | Bản export của M2 (6 user, 13 khóa học, 2 enrollment), hoặc export lại từ laptop có 4 enrollment | M2 |
| 2 | File export đã commit vẫn nằm trong lịch sử git sau khi `git rm` | Không viết lại lịch sử: chỉ là tài khoản demo với mật khẩu công khai. Đổi mật khẩu Admin trên cloud (D6) | M1 |
| 3 | Chi phí Cloud SQL khi bật | Tắt ngoài giờ làm; đã có cảnh báo ngân sách. Tùy chọn: Cloud Scheduler tự tắt mỗi đêm | M1 |
| 4 | Có người import trong lúc người khác đang làm trên cloud | D5: chỉ M1 import, và báo trước | M1 |
| 5 | Cloud chạy bản backend deploy gần nhất, không phải `develop` | Deploy lại sau mỗi lần merge có sửa backend; chạy migration trước (D7) | M1, M5 |
| 6 | Sau khi deploy với `PUBSUB_TOPIC`, thông báo trên cloud ngừng tới khi có worker | Deploy `PUBSUB_TOPIC` cùng lúc hoặc sau khi worker (7.1) sẵn sàng, nếu cần thông báo cho buổi demo | M1, M6 |
