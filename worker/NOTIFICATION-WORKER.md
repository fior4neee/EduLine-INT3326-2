# Notification Worker

Phạm vi: mục 7.1–7.2 của [cloud-data-plan](../backend/docs/cloud-data-plan.md).
Worker HTTP độc lập nhận Pub/Sub push, dùng lại nghiệp vụ notification hiện có
và ghi vào cùng PostgreSQL với API. Không chạy API, outbox relay, reminder job,
email sender, AI ingestion hoặc storage.

## Tổ chức và tương thích

Tất cả file bổ sung nằm trong `worker/`. README rỗng có sẵn được giữ nguyên.
Không cần sửa package/lockfile, service, schema, migration, Dockerfile hay cấu hình
chạy của backend.

- `src/main.ts`: entry point, PORT/HOST, shutdown.
- `src/server.ts`: HTTP push, health, giới hạn body 1 MiB, ACK/lỗi và log.
- `src/push-message.ts`: decode và validate contract hiện có.
- `src/notification-handler.ts`: dựng trực tiếp `PrismaService`,
  `AccessPolicyService`, `NotificationsService`, `NotificationFanoutService`.
  Không bootstrap Nest `AppModule` và không sao chép nghiệp vụ.
- `test/`: parser/HTTP tests và integration tests PostgreSQL.
- `scripts/`: chuẩn bị Prisma riêng và áp dụng migration vào DB test local.

Worker có package/lockfile riêng. Các dependency Nest/Prisma/validation/argon2
khớp phiên bản đã khóa trong backend. Một số dependency như Swagger và argon2
được cần tới bởi imports của service dùng chung, dù worker không mở Swagger hay
chạy auth API. Worker không dùng Pub/Sub SDK: subscription gọi HTTP trực tiếp.

TypeScript đọc source backend qua relative imports, chỉ biên dịch các dependency
được import vào `worker/dist/backend/`. `paths`/`typeRoots` trỏ về dependencies của
worker, nên backend không cần được `npm install` trước. Script chuẩn bị Prisma sao
chép nguyên schema và migrations vào `worker/build/prisma/`; client sinh trong
`worker/node_modules/`. Không duy trì schema hoặc lịch sử migration thứ hai.
`build/`, `dist/`, `node_modules/` đã được root `.gitignore` bỏ qua.

Nếu thay đổi contract/schema/logic backend về sau, cần build và kiểm thử lại
worker. Không có hot reload hay tự chạy migration khi worker khởi động.

## Chạy local

Cần Node.js >= 20.19, npm và PostgreSQL đã có các migration hiện tại. Không cần
tài khoản, credentials, Pub/Sub emulator hoặc tài nguyên GCP.

Từ thư mục `worker`:

```powershell
npm ci
npm run build
Copy-Item .env.example .env
# Chỉnh DATABASE_URL trong .env cho database local đã migrate.
node --env-file=.env dist/worker/src/main.js
```

Hoặc export `DATABASE_URL` vào environment rồi chạy `npm start`. `npm start`
không tự đọc `.env`. Chạy trực tiếp mặc định bind `127.0.0.1:8080`:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/health
```

Health trả `200 {"status":"ok","database":"up"}` hoặc `503` khi DB không tới
được. Worker vẫn khởi động được khi DB tắt; request sau thử kết nối lại. Có thể
đổi `PORT`; `HOST=0.0.0.0` dành cho container. Local HTTP không xác minh OIDC;
không mở cổng local ra Internet. Production dựa vào Cloud Run IAM ở phần dưới.

## Kiểm thử local

Parser và HTTP tests (không cần database/GCP):

```powershell
cd worker
npm ci
npm test
```

Integration tests dùng **database test riêng**, kiểm tra database name kết thúc
`_test`, host loopback và từ chối query parameter `host`. Tests tạo fixture ngẫu
nhiên, chỉ dọn các record mình tạo; không truncate database.

Ví dụ PostgreSQL tạm trên cổng 55432, không dùng database của nhóm:

```powershell
docker run --detach --rm --name eduline-worker-postgres-test --publish 127.0.0.1:55432:5432 --env POSTGRES_USER=worker --env POSTGRES_PASSWORD=worker_test_only --env POSTGRES_DB=eduline_worker_test --tmpfs /var/lib/postgresql/data postgres:16
docker exec eduline-worker-postgres-test pg_isready -U worker -d eduline_worker_test

# Trong worker/, sau khi PostgreSQL báo accepting connections:
$env:DATABASE_URL='postgresql://worker:worker_test_only@127.0.0.1:55432/eduline_worker_test?schema=public&connection_limit=5&connect_timeout=5&pool_timeout=5'
npm run db:test:migrate
npm run test:int

# Chỉ dừng container test vừa tạo; --rm xóa container, dữ liệu ở tmpfs.
docker stop eduline-worker-postgres-test
```

`db:test:migrate` chỉ chạy `prisma migrate deploy` với các migration có sẵn vào
DB test local đã tồn tại. Không dùng lệnh này cho Cloud SQL hoặc DB demo.
Trên Bash dùng `export DATABASE_URL='...'` thay cho cú pháp PowerShell.

Tests bao phủ đủ 8 handler in-app, broadcast/Denied, personal notification,
đọc qua `NotificationsService`, duplicate tuần tự/đồng thời, outbox không bị
worker sửa, lỗi DB rồi redelivery, malformed/unknown/email và ACK sau commit.
Chúng không chứng minh IAM hoặc DLQ thật trên GCP; người deploy kiểm tra riêng.

Kết quả đã chạy trên checkout này:

- Windows, Node 24.22.1: build TypeScript và Prisma Client thành công;
  36 parser/HTTP tests, 10 integration tests PostgreSQL 16 đều pass.
- Docker Linux, Node 20.20.2: clean `npm ci`, build và image runtime thành công.
  Smoke test trả health 200, ghi notification qua HTTP push, replay không tạo
  trùng và từ chối `EMAIL_REQUESTED` bằng 422.
- Tests HTTP/DB cần quyền truy cập loopback; sandbox chặn mạng phải được cấp
  quyền khi kiểm thử. Không có bước nào cần credentials GCP.

## HTTP contract và chính sách lỗi

`POST /pubsub/notifications`, `Content-Type: application/json`, **wrapped push**:

```json
{
  "message": {
    "messageId": "pubsub-message-id",
    "data": "BASE64_OF_EVENT_JSON",
    "attributes": {"eventId": "event-uuid", "type": "ASSIGNMENT_GRADED"}
  },
  "subscription": "projects/PROJECT/subscriptions/notifications-worker"
}
```

JSON bên trong `message.data` theo producer:

```json
{
  "eventId": "93363824-ac29-4220-bbc2-933afee75fa3",
  "type": "ASSIGNMENT_GRADED",
  "occurredAt": "2026-11-12T01:00:00.000Z",
  "data": {
    "submissionId": "sub_1",
    "assignmentId": "asg_1",
    "courseId": "crs_1",
    "userId": "8b60a429-bbe2-42f4-b4a1-881f0aed1a07",
    "score": 85,
    "maxPoints": 100
  }
}
```

IDs phải tồn tại/phù hợp với dữ liệu thật để kiểm chứng notification. Ví dụ cũ
`{"type":"TEST","eventId":"t-1"}` không phải event nghiệp vụ hợp lệ.
Parser dùng `event-types.ts`, `public-id.ts` hiện có; ngày theo
`Date.toISOString()` của publisher. Attributes nếu có phải khớp envelope.
Không dùng Pub/Sub `messageId` làm khóa chống trùng.

| Trường hợp | HTTP | Hành vi |
|---|---|---|
| Xử lý thành công, duplicate hoặc no-op nghiệp vụ hiện có | 204 | ACK sau khi transaction commit |
| `COURSE_PUBLISHED` hợp lệ | 204 | Giữ no-op hiện có; không tạo notification |
| `EMAIL_REQUESTED` hoặc event type chưa hỗ trợ | 422 | Không ACK, Pub/Sub retry rồi DLQ nếu cấu hình đúng |
| Envelope/base64/JSON/payload sai | 400 | Không ACK, retry/DLQ |
| Body quá 1 MiB / không phải JSON | 413 / 415 | Không ACK, retry/DLQ |
| DB/handler lỗi | 503 | Không ACK; thử lại ở lần delivery sau |

Một `4xx` không làm Pub/Sub bỏ message: mã đó vẫn gây retry. Worker không tự
publish DLQ, không đếm attempts và không sleep/retry trong HTTP request.
Log có mã lỗi cố định; event hợp lệ có `eventId`, `type`, `messageId`, số dòng
đã tạo. Không log raw payload, reset URL, email hoặc lỗi DB chứa credentials.

Tạo notification dùng transaction 15 giây (chờ pool tối đa 5 giây). Dedupe giữ
nguyên unique `(sourceEventId, recipientId)` và `skipDuplicates` của backend.
Worker không đọc/cập nhật `outbox.publishedAt` để đánh dấu consume thành công.

## Build container

Chạy từ **root repository**, vì worker import source backend:

```powershell
docker build -f worker/Dockerfile -t eduline-worker:local .
```

Dockerfile-specific ignore file chỉ gửi source/schema/config cần cho build;
không gửi `.env`, node_modules, dump SQL hoặc thư mục `.git`. Image runtime chạy
user `node`, có Prisma engine/OpenSSL, không chứa secret và không khởi động API.

Smoke local với PostgreSQL test nói trên (Docker Desktop):

```powershell
docker run --detach --rm --name eduline-worker-smoke --publish 127.0.0.1:18080:8080 --env 'DATABASE_URL=postgresql://worker:worker_test_only@host.docker.internal:55432/eduline_worker_test?schema=public&connection_limit=5&connect_timeout=5&pool_timeout=5' eduline-worker:local
Invoke-RestMethod http://127.0.0.1:18080/health
docker stop eduline-worker-smoke
```

Trên Linux cần cấu hình `host.docker.internal`/network tương ứng. Các unit và
integration tests ở trên chạy ngoài image runtime.

## Bàn giao GCP (người deploy thực hiện)

1. Build từ root, tag và push image vào Artifact Registry đã được nhóm cấp.
   Không dùng `gcloud run deploy --source worker` vì thiếu source backend ở
   build context. Ví dụ các lệnh dưới dùng placeholder, không tự tạo tài nguyên.
2. Runtime service account của worker cần `roles/cloudsql.client`, quyền đọc
   **secret `database-url`** và kết nối đúng Cloud SQL instance. Không cần JWT
   secret API, Pub/Sub subscriber SDK, publisher hay email credentials. Tính tổng
   `connection_limit × max-instances` của cả worker và API theo sức chứa Cloud SQL.
3. Deploy Cloud Run private, bắt buộc IAM authentication; **không cấp quyền
   invoke cho `allUsers`/`allAuthenticatedUsers` và không dùng
   `--allow-unauthenticated`**. Application không tự verify JWT; lớp Cloud Run IAM
   là ranh giới xác thực. Cấp `roles/run.invoker` chỉ trên worker cho
   `sa-pubsub-push`, cấu hình quyền Pub/Sub service agent mint OIDC token.

```bash
gcloud run deploy worker --image IMAGE_URI --region asia-southeast1 \
  --service-account WORKER_RUNTIME_SA \
  --add-cloudsql-instances CLOUD_SQL_CONNECTION_NAME \
  --set-secrets DATABASE_URL=database-url:latest \
  --set-env-vars NODE_ENV=production \
  --port 8080 --timeout 60 --concurrency 5 --min-instances 0 --max-instances 1 \
  --no-allow-unauthenticated

gcloud run services add-iam-policy-binding worker --region asia-southeast1 \
  --member serviceAccount:PUSH_SA_EMAIL --role roles/run.invoker

gcloud pubsub subscriptions modify-push-config notifications-worker \
  --push-endpoint WORKER_URL/pubsub/notifications \
  --push-auth-service-account PUSH_SA_EMAIL \
  --push-auth-token-audience WORKER_URL
```

4. Giữ wrapped delivery; kiểm tra ack deadline 60 giây, retry 10→600 giây,
   dead-letter topic `notifications-dlq`, subscription `notifications-dlq-sub`
   và IAM chuyển DLQ theo infrastructure README. Giới hạn delivery attempts 5
   là xấp xỉ, không bảo đảm đúng lần thứ năm.
5. Gọi health có identity token, kiểm tra request không xác thực bị từ chối.
   Publish fixture đầy đủ với dữ liệu thật: tạo đúng notification, replay không
   tạo trùng. Publish message lỗi: nhận non-2xx, cuối cùng thấy trong DLQ.
6. Chỉ bật `PUBSUB_TOPIC=notifications` cho API sau/cùng lúc worker sẵn sàng.
   Xác nhận Scheduler gọi `/api/v1/internal/outbox/flush` và internal token của
   API; worker không chạy relay thay API. Không thay code/cấu hình API trong
   thay đổi worker này. Nếu API có migration mới, bên phụ trách DB chạy trước deploy.

Tham khảo chính thức: [push và ACK](https://docs.cloud.google.com/pubsub/docs/push),
[OIDC/Cloud Run](https://docs.cloud.google.com/run/docs/tutorials/pubsub),
[DLQ](https://docs.cloud.google.com/pubsub/docs/dead-letter-topics).

## Các vấn đề ghi nhận, không sửa trong phạm vi này

- Backend package khai báo Pub/Sub nhưng lockfile hiện thiếu dependency đó.
  Worker build độc lập nên không bị chặn; người phụ trách API cần xử lý trước
  clean build/deploy API. Không sửa lockfile backend trong thay đổi worker.
- Tài liệu cũ m2-plan/integration-review/ADR chưa đồng nhất với cloud-data-plan,
  contract thực tế và unique event–recipient; worker bám plan chính và code.
- Email sender chưa được triển khai. Email event sẽ retry/DLQ, không được coi
  là đã gửi. Cần người phụ trách theo dõi DLQ và chốt kế hoạch email riêng;
  không replay reset link hết hạn một cách máy móc.
- Lỗi **publish** hết `OUTBOX_MAX_ATTEMPTS` vẫn ở DB API, không tự vào Pub/Sub
  DLQ. Scheduler, cảnh báo và recovery do bên phụ trách API/GCP xử lý.
- Dedupe hiện có mất dấu nếu người dùng xóa notification rồi event được replay;
  broadcast replay dùng audience hiện tại. Không thêm inbox/ledger/schema mới.
- Điểm nằm trong event nhưng feedback lấy lúc consume; chấm lại trước khi
  consume có thể phối điểm cũ với feedback mới. Không đổi payload/nghiệp vụ.
- Việc kiểm chứng OIDC, IAM, Pub/Sub thật và DLQ trên GCP thuộc người deploy.
