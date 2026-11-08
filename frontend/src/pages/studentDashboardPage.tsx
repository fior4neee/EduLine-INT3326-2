import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, GraduationCap, LibraryBig, RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "../auth/auth-context";
import { getErrorMessage } from "../services/auth";
import { listCatalog, listMyCourses, type Course, type MyCourse } from "../services/courses";

const fallbackImage = "/images/student-learning.png";
const formatMinutes = (minutes: number) => minutes >= 60 ? `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ""}` : `${minutes} phút`;

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [suggestions, setSuggestions] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [enrolledResult, catalogResult] = await Promise.all([listMyCourses(), listCatalog()]);
      setCourses(enrolledResult.data);
      const enrolledIds = new Set(enrolledResult.data.map((item) => item.course.id));
      setSuggestions(catalogResult.data.filter((course) => !enrolledIds.has(course.id)).slice(0, 3));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const activeCourses = useMemo(() => courses.filter(({ enrollment }) => enrollment.status === "Active"), [courses]);
  const completedCount = courses.filter(({ enrollment }) => enrollment.status === "Completed").length;
  const averageProgress = activeCourses.length
    ? Math.round(activeCourses.reduce((total, item) => total + item.progressPercentage, 0) / activeCourses.length)
    : 0;
  const displayName = user?.firstName || user?.username || "bạn";

  return (
    <main className="min-h-screen bg-[#f7f9fc]">
      <div className="mx-auto max-w-[1360px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#153b8f] via-[#2455bd] to-[#4c7be8] px-6 py-8 text-white shadow-xl shadow-blue-200/50 sm:px-10 sm:py-10">
          <div className="absolute -right-16 -top-28 h-80 w-80 rounded-full border-[42px] border-white/5" />
          <div className="absolute -bottom-32 right-40 h-64 w-64 rounded-full bg-cyan-300/10 blur-2xl" />
          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">
                <Sparkles size={14} /> KHÔNG GIAN HỌC TẬP CỦA BẠN
              </span>
              <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">Chào {displayName}, tiếp tục tiến về phía trước!</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Mỗi bài học hoàn thành đưa bạn gần hơn tới mục tiêu. Cùng bắt đầu từ nơi bạn đã dừng lại nhé.</p>
              <Link to={activeCourses[0] ? `/courses/${activeCourses[0].course.slug}` : "/courses"} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50">
                {activeCourses.length ? "Tiếp tục học" : "Khám phá khóa học"}<ArrowRight size={17} />
              </Link>
            </div>
            <div className="hidden w-full max-w-[260px] lg:block">
              <img src={fallbackImage} alt="Minh họa học tập" className="w-full drop-shadow-xl" />
            </div>
          </div>
        </section>

        <section aria-label="Tổng quan học tập" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={<LibraryBig size={19} />} label="Khóa học của tôi" value={loading ? "—" : courses.length} detail="Tổng số đã đăng ký" tone="blue" />
          <SummaryCard icon={<BookOpen size={19} />} label="Đang học" value={loading ? "—" : activeCourses.length} detail="Khóa học đang hoạt động" tone="violet" />
          <SummaryCard icon={<CheckCircle2 size={19} />} label="Đã hoàn thành" value={loading ? "—" : completedCount} detail="Bạn đã đi được một chặng dài" tone="green" />
          <SummaryCard icon={<Sparkles size={19} />} label="Tiến độ trung bình" value={loading ? "—" : `${averageProgress}%`} detail="Trên các khóa đang học" tone="orange" />
        </section>

        {error && <div role="alert" className="mt-7 flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button onClick={() => void loadDashboard()} className="inline-flex items-center gap-2 self-start font-semibold hover:underline"><RefreshCw size={15} /> Thử lại</button></div>}

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">LỘ TRÌNH CỦA BẠN</p><h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Tiếp tục học</h2></div>
            <Link to="/my-courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800">Tất cả khóa học <ArrowRight size={16} /></Link>
          </div>
          {loading ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-[300px] animate-pulse rounded-2xl bg-white shadow-sm" />)}</div> : activeCourses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><GraduationCap size={28} /></div><h3 className="mt-4 text-lg font-bold text-slate-900">Bắt đầu hành trình học của bạn</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Bạn chưa có khóa học đang học. Khám phá danh mục để tìm chủ đề phù hợp.</p><Link to="/courses" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Xem danh mục khóa học<ArrowRight size={16} /></Link></div>
          ) : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{activeCourses.slice(0, 3).map((item) => <MyCourseCard key={item.enrollment.id} item={item} />)}</div>}
        </section>

        <section className="mt-11 pb-6">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">MỞ RỘNG KIẾN THỨC</p><h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Có thể bạn sẽ thích</h2></div><Link to="/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800">Khám phá thêm <ArrowRight size={16} /></Link></div>
          {loading ? <div className="h-40 animate-pulse rounded-2xl bg-white" /> : suggestions.length ? <div className="grid gap-4 md:grid-cols-3">{suggestions.map((course) => <SuggestionCard key={course.id} course={course} />)}</div> : <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">Hiện chưa có gợi ý mới. Hãy quay lại sau nhé.</p>}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string | number; detail: string; tone: string }) {
  const tones: Record<string, string> = { blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", green: "bg-emerald-50 text-emerald-600", orange: "bg-orange-50 text-orange-600" };
  return <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/40"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span></div><p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></article>;
}

function MyCourseCard({ item }: { item: MyCourse }) {
  const { course, progressPercentage, enrollment } = item;
  const instructor = course.instructors.map((person) => `${person.firstName} ${person.lastName}`).join(", ") || "Giảng viên EduLine";
  return <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm shadow-slate-200/40 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/70"><Link to={`/courses/${course.slug}`} className="block"><div className="relative aspect-[16/8] overflow-hidden bg-blue-50"><img src={course.thumbnailUrl || fallbackImage} alt="" className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]" /><span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-blue-700">{course.category || course.difficultyLevel}</span></div><div className="p-5"><p className="text-xs font-medium text-slate-500">{instructor}</p><h3 className="mt-1.5 line-clamp-2 min-h-12 text-lg font-bold leading-6 text-slate-900">{course.title}</h3><div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{progressPercentage >= 100 ? "Đã hoàn thành" : "Tiến độ học tập"}</span><span className="font-bold text-blue-700">{progressPercentage}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all" style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }} /></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><BookOpen size={14} />{course.stats.lessonCount} bài học</span><span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{formatMinutes(course.stats.totalDurationMinutes)}</span></div><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600">{enrollment.status === "Completed" ? "Xem lại khóa học" : "Vào học ngay"}<ArrowRight size={16} /></span></div></Link></article>;
}

function SuggestionCard({ course }: { course: Course }) {
  return <Link to={`/courses/${course.slug}`} className="group flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200/40 transition hover:border-blue-200 hover:shadow-md"><img src={course.thumbnailUrl || fallbackImage} alt="" className="h-24 w-28 shrink-0 rounded-xl bg-blue-50 object-cover" /><div className="min-w-0 py-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">{course.category || course.difficultyLevel}</span><h3 className="mt-1 line-clamp-2 font-bold leading-5 text-slate-900 group-hover:text-blue-700">{course.title}</h3><p className="mt-2 text-xs text-slate-500">{course.stats.lessonCount} bài học <span className="mx-1">·</span>{formatMinutes(course.stats.totalDurationMinutes)}</p></div></Link>;
}
