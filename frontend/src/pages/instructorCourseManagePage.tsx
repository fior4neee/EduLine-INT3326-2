import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Archive, ClipboardList, Eye, Globe, KeyRound, Lock, MessageSquareHeart, Plus, Trash2 } from "lucide-react";
import {
  ENROLLMENT_BADGE,
  ENROLLMENT_LABEL,
  formatDate,
  formatDuration,
  VISIBILITY_BADGE,
  VISIBILITY_LABEL,
} from "../lib/course-format";
import { getErrorMessage } from "../services/api";
import {
  archiveCourse,
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  getCourse,
  listStudents,
  publishCourse,
  setEnrollmentStatus,
  updateCourse,
  type CourseDetail,
  type CourseStudent,
  type LessonInput,
} from "../services/courses";
import {
  createAssignment,
  formatDateTime,
  fromLocalInput,
  listCourseAssignments,
  publishAssignment,
  type Assignment,
  type AssignmentInput,
  type SubmissionType,
} from "../services/assignments";

const inputClass =
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500";

export default function InstructorCourseManagePage() {
  const { courseId = "" } = useParams();
  const created = (useLocation().state as { created?: boolean } | null)?.created;
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(created ? "Đã tạo bản nháp. Thêm chương và bài học, rồi xuất bản." : "");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [assignments, setAssignments] = useState<Map<string, Assignment>>(new Map());
  const [welcome, setWelcome] = useState<string | null>(null);
  const [addingAssignmentTo, setAddingAssignmentTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([getCourse(courseId), listStudents(courseId)]);
      const list = await listCourseAssignments(c.id);
      setAssignments(new Map(list.map((a) => [a.lessonId, a])));
      setWelcome((w) => w ?? c.welcomeMessage ?? "");
      setCourse(c);
      setStudents(s.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!course) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16 text-slate-500">
        {error ? <p className="rounded-xl bg-red-50 p-4 text-red-600">{error}</p> : "Đang tải…"}
      </main>
    );
  }

  const onAddModule = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void run(async () => {
      await createModule(course.id, moduleTitle.trim());
      setModuleTitle("");
    }, "Đã thêm chương.");
  };

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-10 lg:px-10">
      <Link to="/instructor/courses" className="text-sm font-semibold text-blue-600 hover:underline">
        ← Khóa học tôi dạy
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${VISIBILITY_BADGE[course.visibility]}`}>
            {VISIBILITY_LABEL[course.visibility]}
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900">{course.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {course.id} · {course.stats.lessonCount} bài học · {formatDuration(course.stats.totalDurationMinutes)} ·{" "}
            {course.stats.studentCount} học viên
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/courses/${course.slug}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Eye size={16} /> Xem trang khóa học
          </Link>
          {course.visibility !== "Public" && (
            <button type="button" disabled={busy}
              onClick={() => run(() => publishCourse(course.id, "Public"), "Đã xuất bản công khai.")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              <Globe size={16} /> Xuất bản công khai
            </button>
          )}
          {course.visibility !== "Restricted" && (
            <button type="button" disabled={busy}
              onClick={() => run(() => publishCourse(course.id, "Restricted"), "Đã xuất bản (cần mật khẩu).")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
              <Lock size={16} /> Xuất bản có mật khẩu
            </button>
          )}
          {course.visibility !== "Archived" && (
            <button type="button" disabled={busy}
              onClick={() => run(() => archiveCourse(course.id), "Đã lưu trữ khóa học.")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
              <Archive size={16} /> Lưu trữ
            </button>
          )}
        </div>
      </div>

      {message && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p className="mt-5 whitespace-pre-line rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {/* Course password */}
      <section className="mt-8 rounded-2xl border border-slate-200 p-5">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><KeyRound size={18} /> Mật khẩu khóa học</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cần có trước khi “Xuất bản có mật khẩu”. Học viên nhập mật khẩu này một lần khi đăng ký.
        </p>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await updateCourse(course.id, { coursePassword: password });
              setPassword("");
            }, "Đã lưu mật khẩu khóa học.");
          }}
        >
          <input type="password" required minLength={4} maxLength={64} value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="4–64 ký tự" className={inputClass} />
          <button type="submit" disabled={busy}
            className="rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60">
            Lưu mật khẩu
          </button>
        </form>
      </section>

      {/* Welcome message */}
      <section className="mt-6 rounded-2xl border border-slate-200 p-5">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><MessageSquareHeart size={18} /> Lời chào mừng</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gửi đến mỗi học viên dưới dạng thông báo khi họ đăng ký khóa học. Để trống nếu không cần.
        </p>
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => updateCourse(course.id, { welcomeMessage: (welcome ?? "").trim() || null }), "Đã lưu lời chào mừng.");
          }}
        >
          <textarea value={welcome ?? ""} onChange={(e) => setWelcome(e.target.value)} rows={3} maxLength={2000}
            placeholder="Ví dụ: Chào mừng các bạn! Hãy bắt đầu với Chương 1 và đặt câu hỏi bất cứ lúc nào."
            className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" />
          <button type="submit" disabled={busy}
            className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            Lưu lời chào mừng
          </button>
        </form>
      </section>

      {/* Outline */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-slate-900">Nội dung</h2>
        <div className="mt-4 space-y-4">
          {course.modules.map((m) => (
            <div key={m.id} className="rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between bg-slate-50 px-5 py-3">
                <h3 className="font-semibold text-slate-900">{m.title}</h3>
                <button type="button" disabled={busy} aria-label={`Xóa ${m.title}`}
                  onClick={() => run(() => deleteModule(m.id), "Đã xóa chương.")}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
              <ul className="divide-y divide-slate-100">
                {m.lessons.map((l) => {
                  const a = assignments.get(l.id);
                  return (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
                    <span className="w-16 text-xs font-semibold text-slate-400">{l.type === "Assignment" ? "Bài tập" : l.type}</span>
                    <Link to={`/courses/${course.slug}/lessons/${l.id}`} className="text-slate-800 hover:text-blue-600 hover:underline">{l.title}</Link>
                    {a && (
                      <>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${a.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {a.isPublished ? "Đã đăng" : "Nháp"}
                        </span>
                        <span className="text-xs text-slate-500">Hạn {formatDateTime(a.dueAt)}</span>
                        {!a.isPublished && (
                          <button type="button" disabled={busy}
                            onClick={() => run(() => publishAssignment(a.id), "Đã đăng bài tập. Học viên sẽ nhận được thông báo.")}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                            Đăng
                          </button>
                        )}
                        <Link to={`/instructor/assignments/${a.id}`}
                          className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100">
                          Chấm bài
                        </Link>
                      </>
                    )}
                    {l.isPreview && (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Học thử</span>
                    )}
                    <span className="ml-auto text-xs text-slate-400">
                      {l.estimatedDurationMinutes ? `${l.estimatedDurationMinutes} phút` : ""}
                    </span>
                    <button type="button" disabled={busy} aria-label={`Xóa ${l.title}`}
                      onClick={() => run(() => deleteLesson(l.id), "Đã xóa bài học.")}
                      className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </li>
                  );
                })}
              </ul>
              <AddLessonForm busy={busy} onAdd={(input) => run(() => createLesson(m.id, input), "Đã thêm bài học.")} />
              {addingAssignmentTo === m.id ? (
                <AddAssignmentForm
                  busy={busy}
                  onCancel={() => setAddingAssignmentTo(null)}
                  onAdd={(input) =>
                    run(async () => {
                      await createAssignment(m.id, input);
                      setAddingAssignmentTo(null);
                    }, "Đã tạo bài tập (bản nháp). Bấm “Đăng” để giao cho học viên.")
                  }
                />
              ) : (
                <button type="button" onClick={() => setAddingAssignmentTo(m.id)}
                  className="flex w-full items-center gap-1.5 border-t border-slate-100 px-5 py-3 text-xs font-semibold text-violet-700 hover:bg-violet-50">
                  <ClipboardList size={14} /> Thêm bài tập
                </button>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={onAddModule} className="mt-4 flex flex-wrap gap-2">
          <input required maxLength={200} value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)}
            placeholder="Tên chương mới, ví dụ: Chương 1: Giới thiệu" className={`${inputClass} min-w-[280px] flex-1`} />
          <button type="submit" disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60">
            <Plus size={16} /> Thêm chương
          </button>
        </form>
      </section>

      {/* Students */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900">Học viên ({students.length})</h2>
        <p className="mt-1 text-sm text-slate-500">
          Chỉ đình chỉ được học viên đã đăng ký từ 2 lần trở lên và chưa hoàn thành khóa học.
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Học viên</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Số lần đăng ký</th>
                <th className="px-4 py-3">Ngày đăng ký</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Chưa có học viên.</td></tr>
              )}
              {students.map(({ enrollment, student }) => (
                <tr key={enrollment.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{student.lastName} {student.firstName}</div>
                    <div className="text-xs text-slate-500">@{student.username} · {student.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ENROLLMENT_BADGE[enrollment.status]}`}>
                      {ENROLLMENT_LABEL[enrollment.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{enrollment.timesEnrolled}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(enrollment.enrolledAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {enrollment.status === "Suspended" ? (
                      <button type="button" disabled={busy}
                        onClick={() => run(() => setEnrollmentStatus(enrollment.id, "Active"), "Đã gỡ đình chỉ.")}
                        className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                        Gỡ đình chỉ
                      </button>
                    ) : enrollment.status !== "Completed" ? (
                      <button type="button" disabled={busy}
                        onClick={() => run(() => setEnrollmentStatus(enrollment.id, "Suspended"), "Đã đình chỉ học viên.")}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">
                        Đình chỉ
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function AddLessonForm({ busy, onAdd }: { busy: boolean; onAdd: (input: LessonInput) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<LessonInput["type"]>("Text");
  const [minutes, setMinutes] = useState("10");
  const [isPreview, setIsPreview] = useState(false);

  return (
    <form
      className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onAdd({
          title: title.trim(),
          type,
          estimatedDurationMinutes: Number(minutes) || undefined,
          isPreview,
        });
        setTitle("");
        setIsPreview(false);
      }}
    >
      <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Tên bài học mới" aria-label="Tên bài học mới" className={`${inputClass} min-w-[200px] flex-1`} />
      <select value={type} onChange={(e) => setType(e.target.value as LessonInput["type"])} aria-label="Loại bài học" className={inputClass}>
        <option value="Text">Văn bản</option>
        <option value="Video">Video</option>
        <option value="Document">Tài liệu</option>
      </select>
      <input type="number" min={1} max={1000} value={minutes} onChange={(e) => setMinutes(e.target.value)}
        aria-label="Số phút" className={`${inputClass} w-20`} />
      <span className="text-xs text-slate-500">phút</span>
      <label className="flex items-center gap-1.5 text-xs text-slate-600">
        <input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} /> Học thử
      </label>
      <button type="submit" disabled={busy}
        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60">
        <Plus size={14} /> Thêm bài
      </button>
    </form>
  );
}

// New assignment: title, instructions, due date, points, accepted submission
// types and file extensions, "available from", and whether late work is accepted.
function AddAssignmentForm({
  busy,
  onAdd,
  onCancel,
}: {
  busy: boolean;
  onAdd: (input: AssignmentInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [unlockAt, setUnlockAt] = useState("");
  const [maxPoints, setMaxPoints] = useState("100");
  const [types, setTypes] = useState<SubmissionType[]>(["TextEntry", "FileUpload"]);
  const [extensions, setExtensions] = useState("");
  const [allowLate, setAllowLate] = useState(true);

  const toggleType = (t: SubmissionType) =>
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const field = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500";

  return (
    <form
      className="space-y-3 border-t border-slate-100 bg-violet-50/40 px-5 py-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onAdd({
          title: title.trim(),
          instructions,
          maxPoints: Number(maxPoints),
          submissionTypes: types,
          allowedExtensions: extensions.split(",").map((x) => x.trim()).filter(Boolean),
          dueAt: fromLocalInput(dueAt),
          unlockAt: fromLocalInput(unlockAt),
          allowLateSubmissions: allowLate,
        });
      }}
    >
      <p className="text-sm font-bold text-violet-900">Bài tập mới</p>
      <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Tên bài tập" aria-label="Tên bài tập" className={`${field} w-full`} />
      <textarea required maxLength={20000} rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)}
        placeholder="Mô tả / yêu cầu bài tập" aria-label="Mô tả bài tập" className={`${field} w-full`} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-slate-600">
          Hạn nộp
          <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={`${field} mt-1 w-full`} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Mở từ (tùy chọn)
          <input type="datetime-local" value={unlockAt} onChange={(e) => setUnlockAt(e.target.value)} className={`${field} mt-1 w-full`} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Điểm tối đa
          <input type="number" min={0} max={10000} required value={maxPoints} onChange={(e) => setMaxPoints(e.target.value)}
            className={`${field} mt-1 w-full`} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
        <span className="text-xs font-semibold text-slate-600">Hình thức nộp:</span>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={types.includes("TextEntry")} onChange={() => toggleType("TextEntry")} /> Văn bản
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={types.includes("FileUpload")} onChange={() => toggleType("FileUpload")} /> Tải tệp
        </label>
        {types.includes("FileUpload") && (
          <input value={extensions} onChange={(e) => setExtensions(e.target.value)} placeholder=".pdf, .docx (trống = mọi loại)"
            aria-label="Loại tệp cho phép" className={`${field} min-w-[200px] flex-1`} />
        )}
      </div>
      <label className="flex items-center gap-1.5 text-sm text-slate-700">
        <input type="checkbox" checked={allowLate} onChange={(e) => setAllowLate(e.target.checked)} />
        Nhận bài nộp muộn (đánh dấu “muộn”)
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={busy || types.length === 0}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
          Tạo bài tập
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
          Hủy
        </button>
      </div>
      {types.length === 0 && <p className="text-xs text-red-600">Chọn ít nhất một hình thức nộp.</p>}
    </form>
  );
}
