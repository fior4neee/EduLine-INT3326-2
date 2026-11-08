import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import {
  COURSE_PLACEHOLDER_IMAGE,
  ENROLLMENT_BADGE,
  ENROLLMENT_LABEL,
  formatDate,
  instructorNames,
} from "../lib/course-format";
import { getErrorMessage } from "../services/api";
import { listMyCourses, type MyCourse } from "../services/courses";

export default function MyCoursesPage() {
  const [items, setItems] = useState<MyCourse[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listMyCourses()
      .then((r) => setItems(r.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-10 lg:px-10">
      <h1 className="text-3xl font-extrabold text-slate-900">Khóa học của tôi</h1>
      <p className="mt-2 text-slate-500">Các khóa học bạn đã đăng ký.</p>

      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}
      {!items && !error && <p className="mt-8 text-slate-400">Đang tải…</p>}

      {items?.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <BookOpen size={32} className="mx-auto text-slate-400" />
          <p className="mt-3 text-slate-600">Bạn chưa đăng ký khóa học nào.</p>
          <Link
            to="/courses"
            className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Khám phá khóa học
          </Link>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {items?.map(({ course, enrollment, progressPercentage }) => (
          <Link
            key={enrollment.id}
            to={`/courses/${course.slug}`}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-md sm:flex-row sm:items-center"
          >
            <img
              src={course.thumbnailUrl ?? COURSE_PLACEHOLDER_IMAGE}
              alt=""
              className="aspect-video w-full rounded-xl object-cover sm:w-48"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ENROLLMENT_BADGE[enrollment.status]}`}>
                  {ENROLLMENT_LABEL[enrollment.status]}
                </span>
                <span className="text-xs text-slate-400">Đăng ký ngày {formatDate(enrollment.enrolledAt)}</span>
              </div>
              <h2 className="mt-2 text-lg font-bold text-slate-900">{course.title}</h2>
              <p className="text-sm text-slate-500">{instructorNames(course)}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${progressPercentage}%` }} />
                </div>
                <span className="text-xs font-semibold text-slate-600">{progressPercentage}%</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
