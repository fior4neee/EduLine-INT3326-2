import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen, Search, Users } from "lucide-react";
import { listCatalog, type Course } from "../services/courses";
import { getErrorMessage } from "../services/auth";

export default function CoursesPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("search") ?? "");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    setLoading(true); setError("");
    listCatalog({ q: params.get("search") || undefined, pageSize: 24 })
      .then((result) => setCourses(result.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [params]);
  const search = (event: FormEvent) => { event.preventDefault(); setParams(query.trim() ? { search: query.trim() } : {}); };

  return <main className="min-h-screen bg-[#f7f9fc]"><div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">DANH MỤC HỌC TẬP</p><div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Khám phá khóa học</h1><p className="mt-2 text-slate-500">Chọn lộ trình phù hợp và bắt đầu học ngay hôm nay.</p></div><form onSubmit={search} className="flex w-full gap-2 sm:max-w-md"><div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3"><Search size={18} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên khóa học…" className="h-11 w-full bg-transparent text-sm outline-none" /></div><button className="rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">Tìm</button></form></div>
      {error && <p role="alert" className="mt-7 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-white" />)}</div> : courses.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{courses.map((course) => <Link key={course.id} to={`/courses/${course.slug}`} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><img src={course.thumbnailUrl || "/images/student-learning.png"} alt="" className="aspect-[16/9] w-full bg-blue-50 object-cover" /><div className="p-5"><span className="text-xs font-semibold text-blue-600">{course.category || course.difficultyLevel}</span><h2 className="mt-2 line-clamp-2 min-h-14 text-lg font-bold leading-7 text-slate-900 group-hover:text-blue-700">{course.title}</h2><p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-500">{course.shortSummary || "Khám phá nội dung và bắt đầu lộ trình học tập của bạn."}</p><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><BookOpen size={14} />{course.stats.lessonCount} bài học</span><span className="inline-flex items-center gap-1.5"><Users size={14} />{course.stats.studentCount} học viên</span><ArrowRight size={17} className="text-blue-600 transition group-hover:translate-x-1" /></div></div></Link>)}</div> : <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">Không tìm thấy khóa học phù hợp.</div>}
    </div></main>;
}
