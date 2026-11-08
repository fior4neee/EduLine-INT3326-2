import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, LockKeyhole } from "lucide-react";
import { useAuth } from "../auth/auth-context";
import { getErrorMessage } from "../services/auth";
import { enrollInCourse, getCourse, type CourseDetail } from "../services/courses";

export default function CourseDetailPage() {
  const { idOrSlug = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  useEffect(() => { setLoading(true); getCourse(idOrSlug).then(setCourse).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false)); }, [idOrSlug]);

  const enroll = async (event: FormEvent) => {
    event.preventDefault();
    if (!course) return;
    if (!user) { navigate("/login", { state: { from: window.location.pathname } }); return; }
    setEnrolling(true); setError("");
    try { await enrollInCourse(course.id, password || undefined); setCourse(await getCourse(idOrSlug)); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setEnrolling(false); }
  };

  if (loading) return <main className="mx-auto max-w-5xl px-6 py-16 text-slate-500">Đang tải thông tin khóa học…</main>;
  if (!course) return <main className="mx-auto max-w-5xl px-6 py-16"><p role="alert" className="text-red-700">{error || "Không tìm thấy khóa học."}</p><Link to="/courses" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"><ArrowLeft size={16} />Về danh mục</Link></main>;
  const enrolled = Boolean(course.viewer.enrollment && ["Active", "Completed"].includes(course.viewer.enrollment.status));
  const instructors = course.instructors.map((item) => `${item.firstName} ${item.lastName}`).join(", ") || "Giảng viên EduLine";
  return <main className="min-h-screen bg-[#f7f9fc]"><div className="mx-auto max-w-[1120px] px-5 py-8 sm:px-8"><Link to="/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"><ArrowLeft size={16} />Danh mục khóa học</Link><section className="mt-5 grid overflow-hidden rounded-3xl bg-white shadow-sm lg:grid-cols-[1.25fr_.75fr]"><div className="p-6 sm:p-10"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{course.category || course.difficultyLevel}</span><h1 className="mt-5 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">{course.title}</h1><p className="mt-4 text-slate-600">{course.shortSummary || "Khóa học trực tuyến giúp bạn xây dựng kiến thức và kỹ năng qua từng bài học."}</p><p className="mt-5 text-sm text-slate-500">Giảng viên: <span className="font-semibold text-slate-700">{instructors}</span></p><div className="mt-7 flex flex-wrap gap-5 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><BookOpen size={17} />{course.stats.lessonCount} bài học</span><span className="inline-flex items-center gap-2"><Clock3 size={17} />{Math.floor(course.stats.totalDurationMinutes / 60)} giờ học</span><span>{course.stats.studentCount} học viên</span></div></div><div className="bg-blue-50 p-5 sm:p-7"><img src={course.thumbnailUrl || "/images/student-learning.png"} alt="" className="aspect-video w-full rounded-2xl object-cover" />{enrolled ? <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 size={18} className="mr-2 inline" />Bạn đã đăng ký khóa học này.<Link to="/dashboard" className="mt-3 flex items-center gap-2 text-blue-700">Quay lại dashboard <ArrowRight size={16} /></Link></div> : <form onSubmit={enroll} className="mt-5 space-y-3">{course.requiresPassword && <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu khóa học</span><span className="relative block"><LockKeyhole size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500" /></span></label>}<button disabled={enrolling} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{enrolling ? "Đang đăng ký…" : user ? "Đăng ký khóa học" : "Đăng nhập để đăng ký"}</button></form>}</div></section><section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 sm:p-8"><h2 className="text-xl font-extrabold text-slate-900">Nội dung khóa học</h2>{course.modules.length ? <div className="mt-5 divide-y divide-slate-100">{course.modules.map((module, index) => <details key={module.id} open={index === 0} className="py-4"><summary className="cursor-pointer font-bold text-slate-800">Chương {index + 1}: {module.title}<span className="ml-2 text-xs font-normal text-slate-400">{module.lessons.length} bài học</span></summary><ul className="mt-3 space-y-2 pl-5">{module.lessons.map((lesson) => <li key={lesson.id} className="flex items-center justify-between gap-3 text-sm text-slate-600"><span>{lesson.title}</span><span className="shrink-0 text-xs text-slate-400">{lesson.estimatedDurationMinutes ? `${lesson.estimatedDurationMinutes} phút` : lesson.type}</span></li>)}</ul></details>)}</div> : <p className="mt-4 text-sm text-slate-500">Nội dung bài học sẽ được cập nhật sớm.</p>}</section>{error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}</div></main>;
}
