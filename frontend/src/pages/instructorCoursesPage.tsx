import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import {
  COURSE_PLACEHOLDER_IMAGE,
  DIFFICULTY_LABEL,
  VISIBILITY_BADGE,
  VISIBILITY_LABEL,
} from "../lib/course-format";
import { getErrorMessage } from "../services/api";
import {
  createCourse,
  listTeachingCourses,
  type Course,
  type Difficulty,
} from "../services/courses";

// Cover images bundled with the frontend (public/images/courses).
const THUMBNAILS = [
  { label: "ReactJS", url: "/images/courses/reactjs_course.png" },
  { label: "Cloud", url: "/images/courses/cloud_course.png" },
  { label: "An ninh mạng", url: "/images/courses/cybersecurity_course.png" },
  { label: "Python / Dữ liệu", url: "/images/courses/python_data_course.png" },
];

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function InstructorCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    shortSummary: "",
    category: "",
    difficultyLevel: "College" as Difficulty,
    thumbnailUrl: THUMBNAILS[0].url,
    hasCertificate: false,
  });

  useEffect(() => {
    listTeachingCourses()
      .then((r) => setCourses(r.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const onCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const course = await createCourse({
        title: form.title.trim(),
        shortSummary: form.shortSummary.trim() || null,
        category: form.category.trim() || null,
        difficultyLevel: form.difficultyLevel,
        thumbnailUrl: form.thumbnailUrl,
        hasCertificate: form.hasCertificate,
      });
      navigate(`/instructor/courses/${course.id}`, { state: { created: true } });
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-10 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Khóa học tôi dạy</h1>
          <p className="mt-2 text-slate-500">Tạo khóa học, thêm bài học, xuất bản và quản lý học viên.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? <X size={17} /> : <Plus size={17} />} {showForm ? "Đóng" : "Tạo khóa học"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="c-title" className="mb-1.5 block text-sm font-semibold text-slate-700">Tên khóa học</label>
            <input id="c-title" required minLength={3} maxLength={200} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="Ví dụ: Docker cho người mới bắt đầu" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="c-summary" className="mb-1.5 block text-sm font-semibold text-slate-700">Mô tả ngắn</label>
            <textarea id="c-summary" maxLength={500} rows={2} value={form.shortSummary}
              onChange={(e) => setForm({ ...form, shortSummary: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="c-category" className="mb-1.5 block text-sm font-semibold text-slate-700">Chủ đề</label>
            <input id="c-category" maxLength={50} value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} placeholder="Lập trình, Cloud…" />
          </div>
          <div>
            <label htmlFor="c-level" className="mb-1.5 block text-sm font-semibold text-slate-700">Cấp độ</label>
            <select id="c-level" value={form.difficultyLevel}
              onChange={(e) => setForm({ ...form, difficultyLevel: e.target.value as Difficulty })} className={inputClass}>
              {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
                <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="c-thumb" className="mb-1.5 block text-sm font-semibold text-slate-700">Ảnh bìa</label>
            <select id="c-thumb" value={form.thumbnailUrl}
              onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} className={inputClass}>
              {THUMBNAILS.map((t) => <option key={t.url} value={t.url}>{t.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700">
            <input type="checkbox" checked={form.hasCertificate}
              onChange={(e) => setForm({ ...form, hasCertificate: e.target.checked })} />
            Cấp chứng chỉ khi hoàn thành
          </label>
          <div className="flex items-center gap-3 md:col-span-2">
            <button type="submit" disabled={busy}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {busy ? "Đang tạo…" : "Tạo bản nháp"}
            </button>
            <span className="text-xs text-slate-500">Khóa học mới là bản nháp. Thêm bài học rồi xuất bản ở trang quản lý.</span>
          </div>
        </form>
      )}

      {error && <p className="mt-6 whitespace-pre-line rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}
      {!courses && !error && <p className="mt-8 text-slate-400">Đang tải…</p>}
      {courses?.length === 0 && <p className="mt-8 text-slate-500">Bạn chưa có khóa học nào.</p>}

      <div className="mt-8 space-y-3">
        {courses?.map((c) => (
          <Link key={c.id} to={`/instructor/courses/${c.id}`}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-md">
            <img src={c.thumbnailUrl ?? COURSE_PLACEHOLDER_IMAGE} alt="" className="aspect-video w-32 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${VISIBILITY_BADGE[c.visibility]}`}>
                  {VISIBILITY_LABEL[c.visibility]}
                </span>
                <span className="text-xs text-slate-400">{c.id}</span>
              </div>
              <h2 className="mt-1 truncate font-bold text-slate-900">{c.title}</h2>
              <p className="text-sm text-slate-500">
                {c.stats.lessonCount} bài học · {c.stats.studentCount} học viên
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
