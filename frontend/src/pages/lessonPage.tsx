import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
  Lock,
  PlayCircle,
  ScrollText,
} from "lucide-react";
import { useAuth } from "../auth/auth-context";
import AssignmentPanel from "../components/assignmentPanel";
import { getErrorMessage } from "../services/api";
import { getCourse, type CourseDetail, type LessonType } from "../services/courses";
import {
  completeLesson,
  getCourseProgress,
  getLesson,
  getLessonProgress,
  sendVideoProgress,
  type CourseProgress,
  type Lesson,
  type LessonProgress,
} from "../services/lessons";

const LESSON_ICON: Record<LessonType, typeof PlayCircle> = {
  Video: PlayCircle,
  Text: ScrollText,
  Document: FileText,
  Quiz: CheckCircle2,
  Assignment: FileText,
};

const HEARTBEAT_MS = 15_000;

export default function LessonPage() {
  const { idOrSlug = "", lessonId = "" } = useParams();
  const { user, status: authStatus } = useAuth();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [error, setError] = useState<{ locked: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const enrollment = course?.viewer.enrollment;
  // Progress is recorded only for a student with an Active enrollment in a published
  // course (backend rule). Completed students can read their progress but not change it.
  const published = course?.visibility === "Public" || course?.visibility === "Restricted";
  const canRecord = user?.accountType === "Student" && enrollment?.status === "Active" && published;
  const canReadProgress = enrollment?.status === "Active" || enrollment?.status === "Completed";

  const refreshCourseProgress = useCallback(async () => {
    if (!course || !canReadProgress) return;
    setCourseProgress(await getCourseProgress(course.id));
  }, [course, canReadProgress]);

  useEffect(() => {
    // Wait until a saved login is restored, or the first request runs as anonymous.
    if (authStatus === "loading") return;
    let cancelled = false;
    setLesson(null);
    setLessonProgress(null);
    setNotice("");
    (async () => {
      try {
        const [c, l] = await Promise.all([getCourse(idOrSlug), getLesson(lessonId)]);
        if (cancelled) return;
        setCourse(c);
        setLesson(l);
        setError(null);
        const status = c.viewer.enrollment?.status;
        if (status === "Active" || status === "Completed") {
          const [cp, lp] = await Promise.all([getCourseProgress(c.id), getLessonProgress(l.id)]);
          if (!cancelled) {
            setCourseProgress(cp);
            setLessonProgress(lp);
          }
        }
      } catch (err) {
        if (cancelled) return;
        const locked =
          axios.isAxiosError(err) &&
          (err.response?.data as { error?: { code?: string } })?.error?.code === "LESSON_LOCKED";
        setError({ locked, message: getErrorMessage(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idOrSlug, lessonId, user?.id, authStatus]);

  // Flat lesson list in course order, for the sidebar and previous / next.
  const ordered = useMemo(
    () => course?.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))) ?? [],
    [course],
  );
  const index = ordered.findIndex((l) => l.id === lesson?.id);
  const prev = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  const completed = new Set(courseProgress?.completedLessonIds ?? []);

  // When a lesson becomes complete, refresh the course percentage and checkmarks.
  const lessonDone = useRef(false);
  useEffect(() => {
    lessonDone.current = Boolean(lessonProgress?.completedAt);
  }, [lessonProgress]);
  const onProgress = useCallback(
    (p: LessonProgress) => {
      const wasDone = lessonDone.current;
      lessonDone.current = Boolean(p.completedAt);
      setLessonProgress(p);
      if (!wasDone && p.completedAt) void refreshCourseProgress();
    },
    [refreshCourseProgress],
  );

  const onComplete = async () => {
    if (!lesson) return;
    setBusy(true);
    try {
      onProgress(await completeLesson(lesson.id));
      setNotice("Đã đánh dấu hoàn thành.");
    } catch (err) {
      setNotice(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        {error.locked && <Lock size={36} className="mx-auto text-slate-400" />}
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          {error.locked ? "Bài học đã bị khóa" : "Không mở được bài học"}
        </h1>
        <p className="mt-2 text-slate-500">
          {error.locked ? "Hãy đăng ký khóa học để xem bài học này." : error.message}
        </p>
        <Link
          to={`/courses/${idOrSlug}`}
          className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Về trang khóa học
        </Link>
      </main>
    );
  }
  if (!course || !lesson) {
    return <main className="mx-auto max-w-5xl px-6 py-16 text-slate-400">Đang tải…</main>;
  }

  const isDone = Boolean(lessonProgress?.completedAt);
  const readOnlyReason = canRecord
    ? null
    : course.viewer.isStaff
      ? "Bạn đang xem với vai trò giảng viên/Admin: tiến độ không được ghi."
      : enrollment?.status === "Completed"
        ? "Bạn đã hoàn thành khóa học. Tiến độ chỉ được xem, không thay đổi."
        : lesson.isPreview
          ? "Đây là bài học thử. Đăng ký khóa học để lưu tiến độ."
          : null;

  return (
    <main className="mx-auto grid max-w-[1300px] gap-8 px-6 py-8 lg:grid-cols-[1fr_340px] lg:px-10">
      <div className="min-w-0">
        <Link to={`/courses/${course.slug}`} className="text-sm font-semibold text-blue-600 hover:underline">
          ← {course.title}
        </Link>
        <p className="mt-4 text-sm text-slate-500">{ordered[index]?.moduleTitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900 md:text-3xl">{lesson.title}</h1>

        {readOnlyReason && (
          <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">{readOnlyReason}</p>
        )}

        <div className="mt-6">
          {lesson.type === "Video" && (
            <VideoLesson
              key={lesson.id}
              lesson={lesson}
              startAt={lessonProgress?.lastPositionSeconds ?? 0}
              canRecord={Boolean(canRecord)}
              onProgress={onProgress}
            />
          )}

          {lesson.type === "Text" && (
            <article className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-6 leading-8 text-slate-800">
              {lesson.textContent || "Bài học chưa có nội dung."}
            </article>
          )}

          {lesson.type === "Document" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              {lesson.downloadableResources.length === 0 ? (
                <p className="text-slate-500">
                  Tài liệu chưa được tải lên. (Tải tệp lên Cloud Storage sẽ có ở tuần 4.)
                </p>
              ) : (
                <ul className="list-inside list-disc">
                  {lesson.downloadableResources.map((url, i) => (
                    <li key={url}>
                      <a href={url} className="font-semibold text-blue-600 hover:underline" rel="noreferrer">
                        Tài liệu {i + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {lesson.type === "Assignment" &&
            (lesson.assignmentId ? (
              <AssignmentPanel
                key={lesson.assignmentId}
                assignmentId={lesson.assignmentId}
                isStaff={course.viewer.isStaff}
                onSubmitted={() => {
                  void refreshCourseProgress();
                  void getLessonProgress(lesson.id).then(setLessonProgress).catch(() => undefined);
                }}
              />
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                Bài tập chưa được tạo cho bài học này.
              </p>
            ))}

          {lesson.type === "Quiz" && (
            <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Bài kiểm tra sẽ có ở tuần 6.
            </p>
          )}
        </div>

        {/* Completion */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {isDone ? (
            <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={18} /> Đã hoàn thành
            </span>
          ) : canRecord && (lesson.type === "Text" || lesson.type === "Document") ? (
            <button
              type="button"
              disabled={busy}
              onClick={onComplete}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <CheckCircle2 size={18} /> Đánh dấu hoàn thành
            </button>
          ) : canRecord && lesson.type === "Video" ? (
            <span className="text-sm text-slate-500">
              Xem ít nhất 90% video để hoàn thành ({lessonProgress?.percent ?? 0}% đã xem).
            </span>
          ) : null}
          {notice && <span className="text-sm text-slate-600">{notice}</span>}
        </div>

        {/* Previous / next */}
        <div className="mt-8 flex justify-between gap-4 border-t border-slate-100 pt-6">
          {prev ? (
            <Link
              to={`/courses/${course.slug}/lessons/${prev.id}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600"
            >
              <ArrowLeft size={16} /> {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={`/courses/${course.slug}/lessons/${next.id}`}
              className="inline-flex items-center gap-2 text-right text-sm font-semibold text-blue-600 hover:underline"
            >
              {next.title} <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>

      {/* Outline */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5">
            <p className="font-bold text-slate-900">Nội dung khóa học</p>
            {courseProgress && (
              <>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${courseProgress.progressPercentage}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Hoàn thành {courseProgress.progressPercentage}% · {completed.size}/{ordered.length} bài
                </p>
              </>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {course.modules.map((m) => (
              <div key={m.id}>
                <p className="bg-slate-50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {m.title}
                </p>
                <ul>
                  {m.lessons.map((l) => {
                    const Icon = LESSON_ICON[l.type];
                    const open = canReadProgress || course.viewer.isStaff || l.isPreview;
                    const active = l.id === lesson.id;
                    const inner = (
                      <>
                        {completed.has(l.id) ? (
                          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                        ) : canReadProgress ? (
                          <Circle size={16} className="shrink-0 text-slate-300" />
                        ) : (
                          <Icon size={16} className="shrink-0 text-slate-400" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{l.title}</span>
                        {!open && <Lock size={13} className="shrink-0 text-slate-400" />}
                      </>
                    );
                    const cls = `flex items-center gap-2.5 px-5 py-2.5 text-sm ${
                      active ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-700"
                    }`;
                    return (
                      <li key={l.id}>
                        {open ? (
                          <Link to={`/courses/${course.slug}/lessons/${l.id}`} className={`${cls} hover:bg-slate-50`}>
                            {inner}
                          </Link>
                        ) : (
                          <span className={`${cls} cursor-not-allowed opacity-60`}>{inner}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}

// Plays the video, resumes from the saved position, and reports progress about
// every 15 seconds while playing, plus on pause, at the end and when leaving.
function VideoLesson({
  lesson,
  startAt,
  canRecord,
  onProgress,
}: {
  lesson: Lesson;
  startAt: number;
  canRecord: boolean;
  onProgress: (p: LessonProgress) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSentAt = useRef(0);
  const resumed = useRef(false);

  const report = useCallback(
    async (v: HTMLVideoElement | null = videoRef.current) => {
      if (!canRecord || !v || !Number.isFinite(v.duration) || v.duration <= 0) return;
      if (v.currentTime === 0) return; // never played
      lastSentAt.current = Date.now();
      // Whole seconds. At the end, report the full length so a short video is not
      // rounded down below the 90 % completion mark.
      const duration = Math.max(1, Math.round(v.duration));
      const position = v.ended ? duration : Math.min(duration, Math.floor(v.currentTime));
      try {
        onProgress(await sendVideoProgress(lesson.id, position, duration));
      } catch {
        // A missed heartbeat is harmless; the next one carries the latest position.
      }
    },
    [canRecord, lesson.id, onProgress],
  );

  // Save the position when the student leaves the lesson. The element is captured
  // now because React clears the ref before this cleanup runs.
  useEffect(() => {
    const v = videoRef.current;
    return () => void report(v);
  }, [report]);

  // The saved position may arrive after the video metadata: resume once both exist.
  const tryResume = () => {
    const v = videoRef.current;
    if (resumed.current || !v || !Number.isFinite(v.duration)) return;
    if (startAt > 0 && startAt < v.duration - 3) v.currentTime = startAt;
    resumed.current = true;
  };
  useEffect(tryResume, [startAt]);

  if (!lesson.videoUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl bg-slate-900 text-slate-300">
        Video chưa được tải lên.
      </div>
    );
  }

  return (
    <div>
      <video
        ref={videoRef}
        src={lesson.videoUrl}
        controls
        preload="metadata"
        className="aspect-video w-full rounded-2xl bg-black"
        onLoadedMetadata={tryResume}
        onTimeUpdate={(e) => {
          if (!e.currentTarget.paused && Date.now() - lastSentAt.current >= HEARTBEAT_MS) void report();
        }}
        onPause={(e) => void report(e.currentTarget)}
        onEnded={(e) => void report(e.currentTarget)}
      />
      {lesson.isSampleVideo && (
        <p className="mt-2 text-xs text-slate-500">
          Video mẫu (môi trường phát triển): bài học này chưa có video thật.
        </p>
      )}
    </div>
  );
}
