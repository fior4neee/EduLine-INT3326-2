# Kế hoạch M3: tiến độ học, chấm quiz, thống kê

Người phụ trách: **M3 (Huyền Vũ)**, Backend 2. Cập nhật ngày 06/11/2026.

Tài liệu này mô tả M3 làm gì, theo thứ tự nào, dùng dữ liệu nào trong [`data/`](../../data), kết quả mong đợi của từng bước, và cách kiểm tra bằng terminal và bằng eval.

Tài liệu liên quan: [README gốc](../../README.md) (phân vai, roadmap 10 tuần), [backend/README.md](../README.md) (mô hình dữ liệu M2), [quiz-submission-design.md](quiz-submission-design.md) (nộp quiz đồng thời), [capacity-and-load-test.md](capacity-and-load-test.md) (load test tuần 9).

---

## Mục lục

1. [Phạm vi và ranh giới với M2](#1-phạm-vi-và-ranh-giới-với-m2)
2. [Hiện trạng](#2-hiện-trạng)
3. [Dữ liệu sử dụng](#3-dữ-liệu-sử-dụng)
4. [Thiết kế](#4-thiết-kế)
5. [Kế hoạch theo tuần](#5-kế-hoạch-theo-tuần)
6. [Kiểm tra trên terminal](#6-kiểm-tra-trên-terminal)
7. [Eval](#7-eval)
8. [Rủi ro và việc cần thống nhất](#8-rủi-ro-và-việc-cần-thống-nhất)

---

## 1. Phạm vi và ranh giới với M2

| Module | M3 làm | M2 làm |
|---|---|---|
| `progress` | Bảng `lesson_progress`, điểm tiếp tục xem video, % bài học, % khóa học, đánh dấu hoàn thành | Gọi M3 để lấy % cho `GET /me/courses` và `enrolledCourses`. Cung cấp `EnrollmentsService.markCompleted` |
| `scoring` | Hàm chấm thuần `ScoringService.score(questions, answers)`, không truy cập DB | Endpoint quiz, transaction nộp bài, ghi điểm vào `QuizAttempt` / `AttemptAnswer` ([quiz-submission-design.md](quiz-submission-design.md) §3) |
| `analytics` | Dashboard giảng viên: số liệu khóa học, từng quiz, từng assignment, danh sách học viên | Không |

Quy tắc module (README gốc §7): M3 chỉ ghi bảng của mình (`lesson_progress`). Bảng của M2 chỉ được **đọc** cho thống kê. Mọi thay đổi trạng thái enrollment đi qua `EnrollmentsService` của M2.

## 2. Hiện trạng

| Mục | Trạng thái | Cách xử lý đề xuất | Việc |
|---|---|---|---|
| Code M3 trong `backend/src/modules/` | Chưa có. Bản prototype cũ ở `backend/m3/` không còn trong working tree và chưa từng được commit | Viết lại trực tiếp trong `backend/src/modules/{progress,scoring,analytics}` theo cấu trúc module của M2 (dùng `PrismaService`, `@CurrentUser()`, `@IdParam`, `AppException` có sẵn), không tạo thư mục `m3/` riêng nên không cần file placeholder `m2-contracts.ts`. Làm trên nhánh `feature/m3-progress`, commit sau mỗi việc và push sớm để không mất code lần nữa | 5.2–7.4 |
| Bảng `lesson_progress` trong `schema.prisma` | Chưa có ([integration-review.md](integration-review.md) #14) | Thêm model vào chính `schema.prisma` (một lịch sử migration chung, không gộp file bằng `cat`). Tạo migration `lesson_progress` bằng `prisma migrate dev`, mở PR nhỏ chỉ gồm schema + migration để M2 review back-relation trước khi viết service | 5.2 |
| `EnrollmentsService.markCompleted(userId, courseId)` | M2 đã làm, gọi nhiều lần vẫn an toàn | Dùng nguyên hàm này, không tạo interface `EnrollmentCompletion` riêng. `ProgressModule` import `EnrollmentsModule`, gọi hàm sau khi % khóa đạt 100. Nếu cần gọi trong transaction nộp quiz, đề nghị M2 thêm tham số `tx` tùy chọn | 5.4 |
| `progressPercentage` trong `user.mapper.ts` | Placeholder: 100 nếu `Completed`, còn lại 0 | Thêm `CourseProgressService.getCourseProgressMap(userId, courseIds)` trả `Map<courseId, percent>` bằng hai truy vấn `groupBy`. `EnrollmentsService` truyền kết quả vào mapper thay cho hàm placeholder. Giữ quy tắc: enrollment `Completed` luôn hiển thị 100 | 5.5 |
| Quiz API của M2 | Chưa có. Schema `Quiz`, `Question`, `QuizAttempt`, `AttemptAnswer` đã có | Không chờ M2: viết và test `ScoringService.score()` như hàm thuần ngay (unit test + eval VMLU không cần endpoint). Trong integration test, tạo `QuizAttempt` trực tiếp bằng Prisma. Khi M2 làm submit, chỉ cần gọi `score()` và `markLessonCompleted` | 6.1–6.4 |
| Assignment API của M2 | Chưa có. Schema `Assignment`, `Submission` đã có | Viết sẵn `ProgressService.markLessonCompleted({userId, courseId, lessonId}, tx?)` và test bằng cách gọi trực tiếp. Analytics đọc bảng `Submission` nên test được bằng dữ liệu seed, không cần API | 5.3, 7.1 |
| Jest trong `backend/` | Chưa cài | Cài `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest` (ghim phiên bản như M2 đã làm). Thêm script `test` (unit, thư mục `src`) và `test:int` (thư mục `test`, `--runInBand`, từ chối chạy nếu tên DB không kết thúc bằng `_test`). Gửi PR riêng vì M2 cũng sẽ dùng | 5.1 |

## 3. Dữ liệu sử dụng

Toàn bộ dữ liệu nằm trong [`data/`](../../data). Các con số dưới đây đã đếm trực tiếp từ file ngày 06/11/2026.

| File | Số dòng | Trường | Có đáp án? | M3 dùng để |
|---|---|---|---|---|
| `vmlu_mqa_v1.5/dev.jsonl` | 303 | `id, question, choices, answer` | Có | Ngân hàng câu hỏi cho test và eval chấm điểm |
| `vmlu_mqa_v1.5/valid.jsonl` | 744 | `id, question, choices, answer` | Có | Seed demo và eval quy mô lớn hơn |
| `vmlu_mqa_v1.5/test.jsonl` | 9 833 | `id, question, choices` | **Không** | Không dùng để chấm. Có thể dùng làm câu hỏi giả cho load test, với đáp án sinh ngẫu nhiên và ghi rõ là giả |
| `vmlu_squad_v1/vi_squad_benchmark_question_only.json` | 3 310 | `id, question, context` | Không | Lấy `context` làm nội dung bài Text khi test tiến độ |

### 3.1 Cấu trúc VMLU

```json
{"id": "28-0001", "question": "Nếu GDP bình quân thực tế ...", "choices": ["A. 3.0%", "B. 3.1%", "C. 5.62%", "D. 18.0%", "E. 18.6%"], "answer": "B"}
```

- `id` có dạng `<môn>-<số>`. Có 58 môn (`01` đến `58`). Trong `dev.jsonl` mỗi môn có 3 đến 6 câu.
- Số lựa chọn mỗi câu:
  - `dev`: 286 câu có 4 lựa chọn, 15 câu có 3, 2 câu có 5.
  - `valid`: 717 câu có 4 lựa chọn, 27 câu có 3.
- Phân bố đáp án:
  - `dev`: A 75, B 94, C 76, D 57, E 1.
  - `valid`: A 181, B 170, C 202, D 191.

### 3.2 Chuyển VMLU sang schema EduLine

| VMLU | EduLine |
|---|---|
| Mã môn (`28`) | Một `Course` + một `Module` + một `Lesson` kiểu `Quiz` + một `Quiz` |
| `question` | `Question.questionText` |
| `choices` | `Question.options`, bỏ tiền tố `"A. "` |
| `answer` (`"B"`) | `Question.correctOptionIndex` = `"B" - "A"` = 1 |
| (không có) | `points = 10`, `passingScorePercentage = 80` (mặc định của schema) |

Người dùng, khóa học, enrollment và lượt làm bài không có trong bộ dữ liệu nào, nên script seed và test tự tạo.

## 4. Thiết kế

### 4.1 Bảng `lesson_progress`

Thêm vào [`prisma/schema.prisma`](../prisma/schema.prisma) bằng một migration mới (`npx prisma migrate dev --name lesson_progress`):

```prisma
model LessonProgress {
  userId              String    @map("user_id") @db.Uuid
  lessonId            Int       @map("lesson_id")
  courseId            Int       @map("course_id")      // sao từ lesson để tính theo khóa nhanh
  lastPositionSeconds Int       @default(0) @map("last_position_seconds")
  percent             Int       @default(0)            // 0–100, không bao giờ giảm
  completedAt         DateTime? @map("completed_at")
  updatedAt           DateTime  @updatedAt @map("updated_at") // dùng làm "hoạt động gần nhất"

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@id([userId, lessonId])
  @@index([courseId, userId])
  @@map("lesson_progress")
}
```

Mỗi model `User`, `Lesson`, `Course` cần thêm một dòng back-relation. Việc này cần M2 review. Bảng `progress_events` trong ERD cũ **không** làm, vì `updatedAt` đã đủ cho chỉ số "hoạt động 7 ngày".

### 4.2 Quy tắc tiến độ

| Loại bài | Hoàn thành khi | Ai kích hoạt |
|---|---|---|
| `Video` | `percent ≥ 90` | Heartbeat `PUT /lessons/{id}/progress` |
| `Text`, `Document` | Học viên bấm "Hoàn thành" | `POST /lessons/{id}/complete` |
| `Quiz` | Có ít nhất một lượt làm bài `passed = true` | Transaction nộp quiz của M2 gọi `ProgressService.markLessonCompleted` |
| `Assignment` | Đã nộp file | Assignment API của M2 gọi `ProgressService.markLessonCompleted` |

- `percent = max(percent cũ, floor(position / duration × 100))`, giới hạn trong khoảng 0–100. Khi người học tua lùi, `lastPositionSeconds` vẫn được cập nhật nhưng `percent` không giảm.
- `completedAt` chỉ được đặt một lần.
- **Tiến độ khóa học** = `floor(số bài đã hoàn thành × 100 / tổng số bài)`, nên chỉ ra 100 khi mọi bài đã xong. Khi đạt 100, M3 gọi `EnrollmentsService.markCompleted`.
- Chỉ ghi tiến độ khi `AccessPolicy` cho phép học viên học (enrollment `Active`, hoặc bài preview). Enrollment `Completed` thì chỉ đọc, không ghi.

### 4.3 Endpoint

Base path là `/api/v1`. ID nhận được cả hai dạng `les_9901` và `9901`.

| Method | Path | Ai | Body → response |
|---|---|---|---|
| PUT | `/lessons/{id}/progress` | người được học khóa | `{positionSeconds, durationSeconds}`, gửi khoảng 15 giây một lần → `LessonProgress`. Chỉ cho bài Video |
| POST | `/lessons/{id}/complete` | người được học khóa | → `LessonProgress`. Chỉ cho bài Text và Document |
| GET | `/lessons/{id}/progress` | người được học khóa | → `LessonProgress` (toàn số 0 nếu chưa mở bài) |
| GET | `/courses/{id}/progress/me` | người được học khóa | → `{courseId, progressPercentage, completedLessonIds, resumeLessonId}` |
| GET | `/instructor/courses/{id}/analytics` | staff của khóa, Admin | → tổng quan khóa (§4.5) |
| GET | `/instructor/courses/{id}/analytics/students` | staff của khóa, Admin | `?status=&page=&pageSize=` → `{data, meta}`. Mỗi dòng: `{student: {id, username, firstName, lastName, email}, status, progressPercentage, lastActivityAt, quizAvgScorePercentage, submissionsCount}` |

```jsonc
// LessonProgress
{ "lessonId": "les_9901", "lastPositionSeconds": 312, "percent": 52, "completedAt": null }
```

Lỗi dùng định dạng chung của M2: `{ "error": { "code", "message", "details", "requestId" } }`. Các mã lỗi mới:

| Mã | HTTP | Khi nào |
|---|---|---|
| `LESSON_TYPE_NOT_SUPPORTED` | 422 | Gửi heartbeat cho bài không phải Video, hoặc `/complete` cho bài Quiz / Assignment |
| `PROGRESS_NOT_ALLOWED` | 403 | Học viên đã xem được bài nhưng không được ghi tiến độ (enrollment `Completed`) hoặc là giảng viên |
| `LESSON_NOT_FOUND` | 404 | Bài không tồn tại, hoặc người gọi không có quyền xem. Không tiết lộ bài có tồn tại hay không |
| `INVALID_PROGRESS` | 400 | `durationSeconds ≤ 0`, `positionSeconds < 0`, hoặc `positionSeconds > durationSeconds + 5` |

### 4.4 Chấm quiz

Theo [quiz-submission-design.md](quiz-submission-design.md), M3 chỉ viết **hàm thuần**. Transaction, khóa dòng và tính idempotent thuộc về M2.

```ts
score(
  questions: { id: number; correctOptionIndex: number; points: number }[],
  answers:   { id: number; questionId: number; selectedOptionIndex: number | null }[],
): { perAnswer: { id: number; points: number }[]; score: number; maxScore: number }
```

- Đúng thì được `points`, sai hoặc bỏ trống thì được 0.
- `maxScore` = tổng `points` của **mọi** câu, kể cả câu không trả lời.
- Đạt (M2 tính): `score × 100 ≥ passingScorePercentage × maxScore`, chỉ dùng số nguyên.
- Đáp án trỏ tới câu không thuộc quiz thì bị bỏ qua và không được điểm.

### 4.5 Thống kê cho giảng viên

Tất cả là truy vấn tổng hợp SQL qua Prisma (ADR-003) và **không cache**, vì đây là dữ liệu cá nhân (ADR về cache).

| Nhóm | Chỉ số | Cách tính |
|---|---|---|
| Khóa học | `enrollmentsByStatus` | Đếm `Enrollment` theo `status` |
| | `averageProgressPercentage` | Trung bình tiến độ của các enrollment `Active` và `Completed` |
| | `completionRatePercentage` | `Completed / (Active + Completed)` |
| | `activeStudentsLast7Days` | Số `userId` khác nhau có `lesson_progress.updatedAt` hoặc `QuizAttempt.submittedAt` trong 7 ngày qua |
| Từng quiz | `attempts`, `averageScorePercentage`, `passRatePercentage` | Chỉ tính lượt có `status = Submitted` |
| Từng assignment | `submitted`, `graded`, `late` | Đếm `Submission` theo `status`, `isLate` |
| Từng học viên | `progressPercentage`, `lastActivityAt`, `quizAvgScorePercentage`, `submissionsCount` | Phân trang, mặc định 20 dòng, tối đa 100 |

Mọi phần trăm đều là số nguyên. Khi không có gì để đo (quiz chưa ai làm), giá trị là `null` chứ không phải 0.

## 5. Kế hoạch theo tuần

### Trạng thái triển khai (cập nhật 06/11/2026)

Nhánh `feature/m3-progress`, chưa commit. Các mục đã làm đều đã chạy và đạt trên Postgres 16 thật (cluster tạm, không dùng Docker). Chưa chạy Jest trong CI vì repo chưa có CI.

| Việc | Trạng thái |
|---|---|
| 5.1 Jest, ts-jest, Supertest, `@nestjs/testing`, script `test` / `test:int` | Xong |
| 5.2 Model `LessonProgress` và migration `20261106000000_lesson_progress` | Xong. Chưa có M2 review back-relation |
| 5.3 `ProgressModule` và 4 endpoint | Xong |
| 5.4 Hoàn thành khóa thì enrollment `Completed` | Xong. Đã thêm tham số `tx` tùy chọn vào `EnrollmentsService.markCompleted` |
| 5.5 `progressPercentage` thật cho `GET /me/courses` và `enrolledCourses` | Xong |
| 5.6 `npm run seed:m3` | Xong |
| 5.7 Test tiến độ P01–P10 | Xong, 19 test |
| 6.1, 6.2 `ScoringService` thuần và unit test | Xong |
| 6.3 Eval chấm điểm VMLU | Xong, đạt |
| 6.4, 6.5 Gọi từ transaction nộp quiz của M2, test Q01–Q08 | **Chưa làm**: chờ Quiz API của M2. `ProgressService.markLessonCompleted(ref, tx)` đã sẵn sàng và đã test trong một transaction giả lập |
| 7.1, 7.3 `AnalyticsModule` và test A01–A06 | Xong |
| 7.2 Index theo `EXPLAIN` | Chưa làm. Index `lesson_progress(course_id, updated_at)` đã có sẵn trong migration |
| 7.4 Gửi ví dụ response cho M4 | Chưa làm |
| 8.1, 9.1, 10.1 | Chưa làm |

Kết quả lần chạy gần nhất: `typecheck` không lỗi, unit 16/16, integration 35/35, ba eval đều PASS.

Số tuần theo roadmap ở README gốc §14.

### Tuần 4–5: Tiến độ học (demo: xem video, đóng trình duyệt, đăng nhập lại, xem tiếp từ chỗ cũ)

| # | Việc | Kết quả mong đợi |
|---|---|---|
| 5.1 | Cài Jest + ts-jest + Supertest vào `backend/`, thêm script `test`, `test:int` | `npm test` chạy được, 0 test vẫn báo pass |
| 5.2 | Thêm model `LessonProgress` và migration `lesson_progress` | `npx prisma migrate dev` tạo bảng. `\d lesson_progress` trong psql có đủ cột và khóa chính `(user_id, lesson_id)` |
| 5.3 | `ProgressModule`: service + controller cho 4 endpoint tiến độ | Swagger hiện 4 endpoint dưới tag `progress` |
| 5.4 | Gọi `EnrollmentsService.markCompleted` khi khóa học đạt 100% (thêm tham số `tx` tùy chọn để chạy trong transaction của M2) | Hoàn thành bài cuối cùng thì enrollment chuyển sang `Completed`, `completedAt` được đặt |
| 5.5 | Thay placeholder `progressPercentage()` trong `user.mapper.ts` bằng `CourseProgressService.getCourseProgressMap(userId, courseIds)` (hai truy vấn `groupBy` cho mọi khóa, không bị N+1). Service này tách riêng khỏi `ProgressService` để `EnrollmentsService` dùng được mà không bị vòng phụ thuộc module | `GET /me/courses` và `GET /users/me` trả về % thật |
| 5.6 | Script `prisma/seed-m3.ts`: tạo khóa học có bài Video, Text (nội dung từ ViSquad) và Quiz (câu hỏi từ VMLU) | `npm run seed:m3` in số khóa, bài và câu hỏi đã tạo |
| 5.7 | Test tiến độ P01–P10 (§6.4) | Tất cả pass |

### Tuần 6: Chấm quiz (demo: học viên làm quiz, nhận điểm)

| # | Việc | Kết quả mong đợi |
|---|---|---|
| 6.1 | `ScoringModule` với `ScoringService.score()` thuần | Export được để module quiz của M2 import |
| 6.2 | Unit test Q09 (đúng hết, sai hết, bỏ trống, mốc đạt 80%) | Pass, số nguyên chính xác |
| 6.3 | Eval chấm điểm trên VMLU `dev` + `valid` (§7.1) | 100% khớp với bản tính tham chiếu |
| 6.4 | Cùng M2: gọi `markLessonCompleted` khi lượt làm bài `passed = true`, gọi trong cùng transaction nộp bài | Bài Quiz chuyển sang hoàn thành, % khóa tăng |
| 6.5 | Cùng M2: chạy test Q01–Q09 trên Postgres thật | Pass |

### Tuần 7: Dashboard giảng viên

| # | Việc | Kết quả mong đợi |
|---|---|---|
| 7.1 | `AnalyticsModule`: hai endpoint thống kê | Swagger hiện tag `analytics`. Học viên gọi thì nhận 403 |
| 7.2 | Index nếu `EXPLAIN` cho thấy quét toàn bảng (dự kiến `quiz_attempts(quiz_id, status)`) | Endpoint tổng quan dưới 200 ms với dữ liệu seed |
| 7.3 | Test A01–A06 (§6.4) và eval đối chiếu (§7.3) | Pass, số liệu API khớp SQL tính tay |
| 7.4 | Gửi M4 ví dụ response để vẽ dashboard | M4 xác nhận đủ trường |

### Tuần 8–10: Bảo mật, tải, tích hợp

| # | Việc | Kết quả mong đợi |
|---|---|---|
| 8.1 | Rà phân quyền mọi endpoint M3 theo [rbac-matrix.md](rbac-matrix.md), viết test âm | Không endpoint nào trả dữ liệu học viên khác cho một học viên |
| 9.1 | Cùng M5: heartbeat tiến độ và nộp quiz trong k6 với 50 / 100 / 500 người dùng | Không lỗi 5xx. Các bất biến SQL ở §7.4 đều đúng |
| 10.1 | Seed demo, cập nhật README backend §8 với endpoint M3 | Một lệnh reset demo chạy được |

## 6. Kiểm tra trên terminal

### 6.1 Chuẩn bị

Cần một Postgres 16. Có hai cách. Cách 1 là Docker, theo các lệnh bên dưới. Cách 2 là Postgres cài sẵn bằng Homebrew, không cần Docker:

```bash
initdb -D ~/eduline-pg -U eduline --auth=trust
pg_ctl -D ~/eduline-pg -o "-p 5499" -l ~/eduline-pg.log -w start
createdb -h 127.0.0.1 -p 5499 -U eduline eduline_dev
createdb -h 127.0.0.1 -p 5499 -U eduline eduline_test
# DATABASE_URL=postgresql://eduline@127.0.0.1:5499/eduline_dev?schema=public
```

```bash
# 1. Postgres
cd infrastructure && cp -n .env.example .env && docker compose up -d
docker compose ps                      # eduline-postgres: healthy

# 2. Backend
cd ../backend
cp -n .env.example .env                # đặt JWT_ACCESS_SECRET >= 32 ký tự
npm ci
npx prisma migrate deploy
npm run seed                           # admin / Admin#2026
npm run seed:demo                      # giảng viên, học viên, 8 khóa demo
npm run seed:m3                        # khóa có video, bài đọc ViSQuAD và 3 quiz VMLU. Tài khoản m3.student / m3.instructor, mật khẩu Student#2026
npm run start:dev                      # http://localhost:8000/api/v1
```

### 6.2 Kiểm tra dữ liệu nguồn (chạy được ngay, không cần backend)

```bash
cd /Users/vuthuhuyen/EduLine-INT3326-2
python3 -I - <<'EOF'
import json, collections
for s in ["dev", "valid", "test"]:
    rows = [json.loads(l) for l in open(f"data/vmlu_mqa_v1.5/{s}.jsonl") if l.strip()]
    bad = [r["id"] for r in rows if r.get("answer") and
           not 0 <= ord(r["answer"]) - 65 < len(r["choices"])]
    print(s, len(rows), "có đáp án:", sum("answer" in r for r in rows),
          "đáp án ngoài khoảng:", len(bad),
          "số môn:", len({r["id"].split("-")[0] for r in rows}))
EOF
```

Kết quả mong đợi:

```
dev 303 có đáp án: 303 đáp án ngoài khoảng: 0 số môn: 58
valid 744 có đáp án: 744 đáp án ngoài khoảng: 0 số môn: 58
test 9833 có đáp án: 0 đáp án ngoài khoảng: 0 số môn: 58
```

### 6.3 Gọi API bằng curl

```bash
API=http://localhost:8000/api/v1
TOKEN=$(curl -s $API/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"<học viên>","password":"<mật khẩu>"}' | jq -r .accessToken)
H="Authorization: Bearer $TOKEN"

# Xem video: 3 heartbeat, lần cuối tua lùi
curl -s -X PUT $API/lessons/9901/progress -H "$H" -H 'Content-Type: application/json' \
  -d '{"positionSeconds":300,"durationSeconds":600}' | jq
curl -s -X PUT $API/lessons/9901/progress -H "$H" -H 'Content-Type: application/json' \
  -d '{"positionSeconds":560,"durationSeconds":600}' | jq
curl -s -X PUT $API/lessons/9901/progress -H "$H" -H 'Content-Type: application/json' \
  -d '{"positionSeconds":120,"durationSeconds":600}' | jq
```

Kết quả mong đợi sau lệnh thứ ba:

```jsonc
{ "lessonId": "les_9901", "lastPositionSeconds": 120, "percent": 93, "completedAt": "2026-…Z" }
// position theo lần tua lùi, percent giữ 93, completedAt đã đặt từ lần thứ hai
```

```bash
curl -s $API/courses/1234/progress/me -H "$H" | jq   # progressPercentage tăng
curl -s $API/me/courses -H "$H" | jq '.[].progressPercentage'

# Giảng viên
curl -s $API/instructor/courses/1234/analytics -H "Authorization: Bearer $INSTRUCTOR_TOKEN" | jq
curl -s -o /dev/null -w '%{http_code}\n' $API/instructor/courses/1234/analytics -H "$H"  # 403
```

Đối chiếu trực tiếp trong DB:

```bash
docker exec -it eduline-postgres psql -U eduline -d eduline -c \
  "SELECT user_id, lesson_id, last_position_seconds, percent, completed_at FROM lesson_progress ORDER BY updated_at DESC LIMIT 5;"
```

### 6.4 Bộ test tự động

```bash
cd backend
npm run typecheck        # không lỗi
npm test                 # unit test, không cần DB
npm run test:int         # integration test, cần DB có tên kết thúc bằng _test
```

Integration test truncate mọi bảng, nên phải chạy trên DB riêng:

```bash
docker exec eduline-postgres psql -U eduline -c "CREATE DATABASE eduline_test;"
export DATABASE_URL=postgresql://eduline:eduline_dev@localhost:5432/eduline_test
npx prisma migrate deploy
npm run test:int
```

| ID | Kịch bản | Mong đợi |
|---|---|---|
| P01 | Heartbeat 300/600 | `percent 50`, chưa hoàn thành |
| P02 | Heartbeat 540/600 | `percent 90`, `completedAt` được đặt |
| P03 | Tua lùi về 60/600 | `lastPositionSeconds 60`, `percent` giữ nguyên, `completedAt` giữ nguyên |
| P04 | Heartbeat cho bài Text | 422 `LESSON_TYPE_NOT_SUPPORTED` |
| P05 | `durationSeconds = 0` hoặc position âm | 400 `INVALID_PROGRESS` |
| P06 | Học viên chưa ghi danh | 404 `LESSON_NOT_FOUND`, không ghi gì vào DB |
| P07 | Enrollment `Completed` gửi heartbeat | 403 `PROGRESS_NOT_ALLOWED`, đọc tiến độ vẫn được |
| P08 | Gọi `/complete` hai lần | Cùng `completedAt`, không lỗi |
| P09 | Hoàn thành bài cuối cùng | % khóa = 100, enrollment `Completed` |
| P10 | 3/4 bài hoàn thành | % khóa = 75. Với 2/3 bài là 66 (làm tròn xuống) |
| Q09 | `score()`: đúng hết, sai hết, bỏ trống, 8/10 với mốc 80% | 100/100, 0/100, 0/100, đạt |
| A01 | Học viên gọi analytics | 403 |
| A02 | Giảng viên của khóa khác gọi | 403 |
| A03 | Quiz chưa ai làm | `averageScorePercentage: null` |
| A04 | 2 enrollment Completed, 2 Active | `completionRatePercentage 50` |
| A05 | Một học viên có heartbeat 8 ngày trước | Không tính vào `activeStudentsLast7Days` |
| A06 | `pageSize=500` | 400 `VALIDATION_FAILED` (tối đa 100) |

## 7. Eval

Eval đo độ đúng của số liệu trên dữ liệu thật, khác với unit test vốn chỉ kiểm vài ca viết tay. Mỗi eval có script, chỉ số và ngưỡng đạt. Script đặt trong `backend/scripts/eval/` và in kết quả ra terminal.

### 7.1 Eval chấm điểm trên VMLU

**Script:** `npm run eval:scoring` (tương đương `scripts/eval/scoring-vmlu.ts --split dev,valid --seed 42 --reps 50`). Không cần database.

Với mỗi môn, script tạo một quiz từ các câu VMLU. Sau đó nó mô phỏng 5 kiểu học viên, chấm bằng `ScoringService.score()` và so với một bản tính tham chiếu độc lập (đếm số câu đúng × 10).

| Học viên mô phỏng | Mong đợi |
|---|---|
| Chọn đúng đáp án VMLU mọi câu | 100% số quiz được tối đa điểm và đạt |
| Chọn sai mọi câu | Điểm 0, không đạt |
| Bỏ trống mọi câu | Điểm 0, `maxScore` vẫn bằng tổng điểm |
| Chọn ngẫu nhiên (seed cố định, lặp 50 lần mỗi quiz) | Tỷ lệ đúng trung bình gần mức kỳ vọng: **25,4%** với `dev`, **25,3%** với `valid` (vì đa số câu có 4 lựa chọn) |
| Đúng đúng mốc 80% (số câu tối thiểu để đạt) | Đạt |
| Thiếu đúng 1 câu so với mốc | Không đạt |

**Chỉ số và ngưỡng:**

| Chỉ số | Ngưỡng đạt |
|---|---|
| Tỷ lệ lượt mà `score`, `maxScore` khớp bản tham chiếu | **100%** (303 + 744 câu, 58 môn × 5 kiểu học viên × 2 split = 580 lượt) |
| Tỷ lệ quyết định `passed` khớp | **100%** |
| Tỷ lệ đúng của học viên ngẫu nhiên | Lệch tối đa ±3 điểm phần trăm so với kỳ vọng |

**Kết quả đã chạy ngày 06/11/2026 (seed 42):**

```
ok   dev score: 290/290 match (58 quizzes, 303 questions)
ok   dev passed: 290/290 match
ok   dev random student: accuracy 25.4% vs expected 25.4% over 50 runs
ok   valid score: 290/290 match (58 quizzes, 744 questions)
ok   valid passed: 290/290 match
ok   valid random student: accuracy 24.9% vs expected 25.3% over 50 runs
PASS
```

Script thoát với mã khác 0 nếu có chỉ số dưới ngưỡng. Nhờ vậy có thể đưa vào CI. Cả ba eval đã chạy đạt ngày 06/11/2026; kết quả của hai eval cần DB là 200/200 chuỗi heartbeat khớp mô hình (3 317 heartbeat kiểm từng bước) và mọi con số dashboard khớp SQL với 30 học viên giả lập.

### 7.2 Eval tiến độ

**Script:** `npm run eval:progress`. Cần `DATABASE_URL` trỏ tới DB `_test`; script từ chối chạy nếu tên DB không kết thúc bằng `_test`.

Script phát lại 200 chuỗi heartbeat sinh ngẫu nhiên (có tua tới, tua lùi, gửi trùng, gửi sai thứ tự) vào `ProgressService` trên DB `_test`. Kết quả được so với một bộ mô phỏng thuần trong bộ nhớ.

| Chỉ số | Ngưỡng |
|---|---|
| `percent` cuối cùng khớp mô phỏng | 100% |
| `percent` không bao giờ giảm qua các bước | 100% |
| `completedAt` được đặt đúng một lần và đúng lúc vượt 90% | 100% |
| % khóa học khớp `floor(hoàn thành × 100 / tổng)` | 100% |

### 7.3 Eval thống kê

**Script:** `npm run eval:analytics`. Cần `DATABASE_URL` trỏ tới DB `_test`.

Script seed một khóa có 2 quiz VMLU và 30 học viên giả lập: có người làm xong, người làm dở, người bỏ học, bị đình chỉ, nộp trễ. Sau đó nó gọi API analytics và so từng con số với một câu SQL viết tay độc lập.

| Chỉ số | Ngưỡng |
|---|---|
| Mọi trường trong response khớp SQL | 100% |
| Thời gian phản hồi endpoint tổng quan (30 học viên, 58 quiz) | < 200 ms |

### 7.4 Bất biến sau load test (tuần 9, cùng M5)

Chạy sau mỗi lượt k6 ([capacity-and-load-test.md](capacity-and-load-test.md)):

```sql
-- 1. Không lượt nộp nào thiếu điểm                       → mong đợi 0
SELECT count(*) FROM quiz_attempts WHERE status='Submitted' AND score IS NULL;
-- 2. Không học viên nào có 2 lượt đang mở cùng một quiz   → mong đợi 0 dòng
SELECT quiz_id, user_id FROM quiz_attempts WHERE status='InProgress' GROUP BY 1,2 HAVING count(*)>1;
-- 3. Điểm luôn bằng tổng điểm từng câu                   → mong đợi 0
SELECT count(*) FROM quiz_attempts a
 WHERE a.status='Submitted'
   AND a.score <> (SELECT coalesce(sum(points_awarded),0) FROM attempt_answers WHERE attempt_id=a.id);
-- 4. percent nằm trong 0–100                             → mong đợi 0
SELECT count(*) FROM lesson_progress WHERE percent NOT BETWEEN 0 AND 100;
```

Kết quả nộp báo cáo: bảng p50/p95/p99 và tỷ lệ lỗi cho heartbeat và nộp quiz ở mức 50 / 100 / 500 người dùng, kèm kết quả 4 câu SQL trên.

## 8. Rủi ro và việc cần thống nhất

| # | Vấn đề | Đề xuất | Cần ai |
|---|---|---|---|
| 1 | Bản prototype `backend/m3/` đã mất, không có trong git | Đã viết lại trong `backend/src/modules/` trên nhánh `feature/m3-progress`. **Chưa commit**: cần commit và push sớm để không mất lần nữa | M3 |
| 2 | Thêm back-relation vào `User`, `Lesson`, `Course` là sửa model của M2 | Gửi PR nhỏ chỉ có migration để M2 review trước | M2 |
| 3 | Prototype cũ dùng `scoreAttempt(tx, attemptId)`, còn [quiz-submission-design.md](quiz-submission-design.md) quy định hàm thuần `score(questions, answers)` | Theo tài liệu thiết kế (hàm thuần) | M1, M2 |
| 4 | Giảng viên thêm bài mới sau khi học viên đã `Completed` | Enrollment giữ `Completed`, % hiển thị có thể dưới 100 | M1 |
| 5 | Heartbeat 15 giây với 500 người dùng là khoảng 33 lần ghi/giây | Một câu `upsert` cho mỗi heartbeat, không transaction. Nếu nghẽn thì giãn chu kỳ lên 30 giây | M5 |
| 6 | `test.jsonl` của VMLU không có đáp án | Không dùng để chấm điểm hay eval | M3 |
