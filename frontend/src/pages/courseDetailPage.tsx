import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Lock,
  PlayCircle,
  ScrollText,
  Users,
} from "lucide-react";
import { useAuth } from "../auth/auth-context";
import {
  COURSE_PLACEHOLDER_IMAGE,
  DIFFICULTY_LABEL,
  ENROLLMENT_BADGE,
  ENROLLMENT_LABEL,
  formatDate,
  formatDuration,
  instructorNames,
  VISIBILITY_BADGE,
  VISIBILITY_LABEL,
} from "../lib/course-format";
import { getErrorMessage } from "../services/api";
import {
  dropCourse,
  enroll,
  getCourse,
  type CourseDetail,
  type LessonType,
} from "../services/courses";

const LESSON_ICON: Record<LessonType, typeof PlayCircle> = {
  Video: PlayCircle,
  Text: ScrollText,
  Document: FileText,
  Quiz: CheckCircle2,
  Assignment: FileText,
};

export default function CourseDetailPage() {
  const { idOrSlug = "" } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setCourse(await getCourse(idOrSlug));
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [idOrSlug]);

  // Reload when the user logs in or out: the enrollment box depends on who is viewing.
  useEffect(() => {
    void load();
  }, [load, user?.id]);

  if (error && !course) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-2xl font-bold text-slate-900">Không tìm thấy khóa học</h1>
        <p className="mt-2 text-slate-500">{error}</p>
        <Link to="/courses" className="mt-6 inline-block font-semibold text-blue-600 hover:underline">
          ← Về danh sách khóa học
        </Link>
      </main>
    );
  }
  if (!course) return <main className="mx-auto max-w-5xl px-6 py-16 text-slate-400">Đang tải…</main>;

  const canSeeLessons =
    course.viewer.isStaff ||
    course.viewer.enrollment?.status === "Active" ||
    course.viewer.enrollment?.status === "Completed";

  return (
    <main className="bg-white">
      {/* Header */}
      <section className="bg-gradient-to-br from-[#dbeafe] via-[#eff6ff] to-[#e0e7ff]">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-6 py-10 lg:grid-cols-[1fr_420px] lg:px-10 lg:py-14">
          <div>
            <Link to="/courses" className="text-sm font-semibold text-blue-600 hover:underline">
              ← Khóa học
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
              {course.category && (
                <span className="rounded-lg bg-white px-3 py-1.5 text-blue-600">{course.category}</span>
              )}
              <span className="rounded-lg bg-white px-3 py-1.5 text-slate-700">
                {DIFFICULTY_LABEL[course.difficultyLevel]}
              </span>
              {course.visibility !== "Public" && (
                <span className={`rounded-lg px-3 py-1.5 ${VISIBILITY_BADGE[course.visibility]}`}>
                  {VISIBILITY_LABEL[course.visibility]}
                </span>
              )}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
              {course.title}
            </h1>
            {course.shortSummary && <p className="mt-4 text-lg leading-8 text-slate-600">{course.shortSummary}</p>}
            <p className="mt-4 text-sm text-slate-600">
              Giảng viên: <span className="font-semibold text-slate-900">{instructorNames(course)}</span>
            </p>
            <div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <Users size={16} /> {course.stats.studentCount} học viên
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen size={16} /> {course.stats.lessonCount} bài học
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 size={16} /> {formatDuration(course.stats.totalDurationMinutes)}
              </span>
              {course.hasCertificate && (
                <span className="flex items-center gap-1.5">
                  <Award size={16} /> Có chứng chỉ
                </span>
              )}
            </div>
          </div>
          <img
            src={course.thumbnailUrl ?? COURSE_PLACEHOLDER_IMAGE}
            alt={course.title}
            className="aspect-video w-full rounded-2xl object-cover shadow-lg"
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-8 px-6 py-10 lg:grid-cols-[1fr_380px] lg:px-10">
        {/* Outline */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Nội dung khóa học</h2>
          {course.modules.length === 0 && (
            <p className="mt-4 text-slate-500">Khóa học chưa có bài học nào.</p>
          )}
          <div className="mt-5 space-y-4">
            {course.modules.map((m) => (
              <div key={m.id} className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between bg-slate-50 px-5 py-3">
                  <h3 className="font-semibold text-slate-900">{m.title}</h3>
                  <span className="text-xs text-slate-500">{m.lessons.length} bài</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {m.lessons.map((l) => {
                    const Icon = LESSON_ICON[l.type];
                    const open = canSeeLessons || l.isPreview;
                    return (
                      <li key={l.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                        <Icon size={17} className={open ? "text-blue-600" : "text-slate-400"} />
                        <span className={open ? "text-slate-800" : "text-slate-500"}>{l.title}</span>
                        {l.isPreview && !canSeeLessons && (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Học thử
                          </span>
                        )}
                        <span className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                          {l.estimatedDurationMinutes ? `${l.estimatedDurationMinutes} phút` : ""}
                          {!open && <Lock size={14} />}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Enrollment box */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <EnrollmentBox course={course} onChanged={load} />
        </aside>
      </section>
    </main>
  );
}

function EnrollmentBox({ course, onChanged }: { course: CourseDetail; onChanged: () => Promise<void> }) {
  const { user } = useAuth();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDrop, setConfirmDrop] = useState(false);

  const enrollment = course.viewer.enrollment;
  const now = Date.now();
  const notOpenYet = course.enrollmentOpensAt && new Date(course.enrollmentOpensAt).getTime() > now;
  const closed = course.enrollmentClosesAt && new Date(course.enrollmentClosesAt).getTime() < now;
  const published = course.visibility === "Public" || course.visibility === "Restricted";

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      setConfirmDrop(false);
      setPassword("");
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onEnroll = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void run(
      () => enroll(course.id, course.requiresPassword ? password : undefined),
      "Đăng ký thành công! Khóa học đã có trong “Khóa học của tôi”.",
    );
  };

  let body: ReactNode;

  if (!user) {
    body = (
      <>
        <p className="text-sm text-slate-600">Đăng nhập bằng tài khoản học viên để đăng ký khóa học.</p>
        <Link
          to="/login"
          state={{ from: location.pathname }}
          className="mt-4 flex h-12 items-center justify-center rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
        >
          Đăng nhập để đăng ký
        </Link>
      </>
    );
  } else if (course.viewer.isStaff) {
    body = (
      <>
        <p className="text-sm text-slate-600">
          {user.accountType === "Admin" ? "Bạn là Admin." : "Bạn là giảng viên của khóa học này."}
        </p>
        <Link
          to={`/instructor/courses/${course.id}`}
          className="mt-4 flex h-12 items-center justify-center rounded-xl bg-slate-900 font-semibold text-white hover:bg-slate-800"
        >
          Quản lý khóa học
        </Link>
      </>
    );
  } else if (user.accountType !== "Student") {
    body = <p className="text-sm text-slate-600">Chỉ tài khoản học viên mới đăng ký được khóa học.</p>;
  } else if (enrollment && enrollment.status !== "Dropped") {
    body = (
      <>
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${ENROLLMENT_BADGE[enrollment.status]}`}>
          {ENROLLMENT_LABEL[enrollment.status]}
        </span>
        {enrollment.status === "Active" && (
          <>
            <p className="mt-3 text-sm text-slate-600">Bạn đã đăng ký khóa học này.</p>
            <Link
              to="/my-courses"
              className="mt-4 flex h-12 items-center justify-center rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              Đến khóa học của tôi
            </Link>
            {confirmDrop ? (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                Hủy đăng ký khóa học này?
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => dropCourse(course.id), "Đã hủy đăng ký.")}
                    className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white disabled:opacity-60"
                  >
                    Hủy đăng ký
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDrop(false)}
                    className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-700"
                  >
                    Không
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDrop(true)}
                className="mt-3 w-full text-sm font-semibold text-slate-500 hover:text-red-600"
              >
                Hủy đăng ký
              </button>
            )}
          </>
        )}
        {enrollment.status === "Completed" && (
          <p className="mt-3 text-sm text-slate-600">
            Bạn đã hoàn thành khóa học. Bạn vẫn xem được nội dung và kết quả của mình.
          </p>
        )}
        {enrollment.status === "Suspended" && (
          <p className="mt-3 text-sm text-slate-600">
            Bạn đã bị đình chỉ khỏi khóa học này. Liên hệ giảng viên nếu cần hỗ trợ.
          </p>
        )}
      </>
    );
  } else if (!published) {
    body = <p className="text-sm text-slate-600">Khóa học này hiện không mở đăng ký.</p>;
  } else {
    body = (
      <form onSubmit={onEnroll}>
        {notOpenYet && (
          <p className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <CalendarClock size={16} /> Mở đăng ký từ {formatDate(course.enrollmentOpensAt!)}.
          </p>
        )}
        {closed && (
          <p className="mb-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
            Đã hết hạn đăng ký ({formatDate(course.enrollmentClosesAt!)}).
          </p>
        )}
        {course.prerequisites.length > 0 && (
          <div className="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            Cần hoàn thành trước:
            <ul className="mt-1 list-inside list-disc">
              {course.prerequisites.map((p) => (
                <li key={p.id}>
                  <Link to={`/courses/${p.slug}`} className="font-semibold hover:underline">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {course.requiresPassword && (
          <div className="mb-3">
            <label htmlFor="course-password" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Mật khẩu khóa học
            </label>
            <input
              id="course-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Do giảng viên cung cấp"
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        )}
        <button
          type="submit"
          disabled={busy || Boolean(notOpenYet) || Boolean(closed)}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Đang xử lý…" : enrollment?.status === "Dropped" ? "Đăng ký lại" : "Đăng ký học miễn phí"}
        </button>
      </form>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-2xl font-extrabold text-blue-600">Miễn phí</p>
      <div className="mt-4">{body}</div>
      {message && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p className="mt-3 whitespace-pre-line rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
