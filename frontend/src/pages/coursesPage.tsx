import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import CourseCard from "../components/courseCard";
import { DIFFICULTY_LABEL } from "../lib/course-format";
import { getErrorMessage } from "../services/api";
import type { Paginated } from "../services/auth";
import { listCatalog, type Course, type Difficulty } from "../services/courses";

const PAGE_SIZE = 12;
const DIFFICULTIES = Object.keys(DIFFICULTY_LABEL) as Difficulty[];

// Filters live in the URL (?search=&level=&sort=&page=), so the navbar search
// and the back button work.
export default function CoursesPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const level = (params.get("level") as Difficulty | null) ?? undefined;
  const sort = params.get("sort") === "title" ? "title" : "newest";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [input, setInput] = useState(search);
  const [result, setResult] = useState<Paginated<Course> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listCatalog({ q: search || undefined, difficultyLevel: level, sort, page, pageSize: PAGE_SIZE })
      .then((r) => !cancelled && (setResult(r), setError("")))
      .catch((err) => !cancelled && setError(getErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [search, level, sort, page]);

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  };

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    update({ search: input.trim() || undefined });
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.meta.total / PAGE_SIZE)) : 1;

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-10 lg:px-12">
      <h1 className="text-3xl font-extrabold text-slate-900 md:text-4xl">Khóa học</h1>
      <p className="mt-2 text-slate-500">Tất cả khóa học đang mở trên EduLine.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form onSubmit={onSearch} className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 md:max-w-md">
          <Search size={18} className="text-slate-500" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tìm theo tên hoặc mô tả…"
            aria-label="Tìm khóa học"
            className="w-full bg-transparent text-sm outline-none"
          />
        </form>

        <select
          aria-label="Cấp độ"
          value={level ?? ""}
          onChange={(e) => update({ level: e.target.value || undefined })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
        >
          <option value="">Mọi cấp độ</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABEL[d]}
            </option>
          ))}
        </select>

        <select
          aria-label="Sắp xếp"
          value={sort}
          onChange={(e) => update({ sort: e.target.value === "title" ? "title" : undefined })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
        >
          <option value="newest">Mới nhất</option>
          <option value="title">Theo tên A–Z</option>
        </select>

        {result && (
          <span className="ml-auto text-sm text-slate-500">{result.meta.total} khóa học</span>
        )}
      </div>

      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}
      {!result && !error && <p className="mt-8 text-slate-400">Đang tải…</p>}
      {result?.data.length === 0 && (
        <p className="mt-10 rounded-xl bg-slate-50 p-8 text-center text-slate-500">
          Không tìm thấy khóa học nào phù hợp.
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {result?.data.map((course) => <CourseCard key={course.id} course={course} />)}
      </div>

      {result && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3 text-sm text-slate-600">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => update({ page: String(page - 1) })}
            aria-label="Trang trước"
            className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          Trang {page}/{totalPages}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => update({ page: String(page + 1) })}
            aria-label="Trang sau"
            className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
