import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Archive, Eye, Globe, KeyRound, Lock, Plus, Trash2 } from "lucide-react";
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

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([getCourse(courseId), listStudents(courseId)]);
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
                {m.lessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <span className="w-16 text-xs font-semibold text-slate-400">{l.type}</span>
                    <span className="text-slate-800">{l.title}</span>
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
                ))}
              </ul>
              <AddLessonForm busy={busy} onAdd={(input) => run(() => createLesson(m.id, input), "Đã thêm bài học.")} />
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
