import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import SubmissionComments from "../components/submissionComments";
import { getErrorMessage } from "../services/api";
import {
  formatDateTime,
  getGradebook,
  gradeSubmission,
  STATE_BADGE,
  STATE_LABEL,
  type Assignment,
  type GradebookRow,
} from "../services/assignments";

// Course staff: every student's state on one assignment, with grading and comments.
export default function GradebookPage() {
  const { assignmentId = "" } = useParams();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [rows, setRows] = useState<GradebookRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const book = await getGradebook(assignmentId);
      setAssignment(book.assignment);
      setRows(book.data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [assignmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!assignment) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16 text-slate-500">
        {error ? <p className="rounded-xl bg-red-50 p-4 text-red-600">{error}</p> : "Đang tải…"}
      </main>
    );
  }

  const current = rows.find((r) => r.student.id === selected) ?? null;
  const count = (state: string) => rows.filter((r) => r.submissionState === state).length;

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10 lg:px-10">
      <Link to={`/instructor/courses/${assignment.courseId}`} className="text-sm font-semibold text-blue-600 hover:underline">
        ← Quản lý khóa học
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold text-slate-900">Chấm bài: {assignment.title}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Hạn nộp {formatDateTime(assignment.dueAt)} · {assignment.maxPoints} điểm ·{" "}
        {assignment.isPublished ? "Đã đăng" : "Bản nháp"}
      </p>
      <p className="mt-3 flex flex-wrap gap-2 text-xs">
        {(["Submitted", "Late", "Graded", "Missing", "NotSubmitted"] as const).map((s) => (
          <span key={s} className={`rounded-full px-2.5 py-1 font-semibold ${STATE_BADGE[s]}`}>
            {STATE_LABEL[s]}: {count(s)}
          </span>
        ))}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Học viên</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Nộp lúc</th>
                <th className="px-4 py-3">Điểm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Chưa có học viên.</td></tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.student.id}
                  onClick={() => setSelected(r.student.id)}
                  className={`cursor-pointer hover:bg-slate-50 ${selected === r.student.id ? "bg-blue-50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{r.student.lastName} {r.student.firstName}</div>
                    <div className="text-xs text-slate-500">@{r.student.username}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_BADGE[r.submissionState]}`}>
                      {STATE_LABEL[r.submissionState]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.submission ? formatDateTime(r.submission.submittedAt) : "—"}</td>
                  <td className="px-4 py-3 text-slate-900">
                    {r.submission?.score != null ? `${r.submission.score}/${assignment.maxPoints}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 p-5">
          {!current && <p className="text-sm text-slate-400">Chọn một học viên để xem và chấm bài.</p>}
          {current && !current.submission && (
            <p className="text-sm text-slate-500">
              {current.student.lastName} {current.student.firstName} chưa nộp bài.
            </p>
          )}
          {current?.submission && (
            <GradePanel
              key={current.submission.id}
              row={current}
              maxPoints={assignment.maxPoints}
              onGraded={load}
            />
          )}
        </aside>
      </div>
    </main>
  );
}

function GradePanel({ row, maxPoints, onGraded }: { row: GradebookRow; maxPoints: number; onGraded: () => Promise<void> }) {
  const sub = row.submission!;
  const [score, setScore] = useState(sub.score != null ? String(sub.score) : "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await gradeSubmission(sub.id, Number(score), feedback.trim() || null);
      setMessage("Đã lưu điểm. Học viên sẽ nhận được thông báo.");
      await onGraded();
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="font-bold text-slate-900">{row.student.lastName} {row.student.firstName}</p>
      <p className="text-xs text-slate-500">
        Nộp lúc {formatDateTime(sub.submittedAt)} {sub.isLate && <span className="font-semibold text-amber-700">· muộn</span>}
      </p>
      {sub.textBody && (
        <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
          {sub.textBody}
        </p>
      )}
      {sub.fileName && <p className="mt-3 text-sm text-slate-700">Tệp: {sub.fileName}</p>}

      <form onSubmit={onSubmit} className="mt-4 space-y-2">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="grade-score">
          Điểm (0–{maxPoints})
        </label>
        <input id="grade-score" type="number" required min={0} max={maxPoints} value={score}
          onChange={(e) => setScore(e.target.value)}
          className="h-10 w-28 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" />
        <label className="block text-sm font-semibold text-slate-700" htmlFor="grade-feedback">Nhận xét</label>
        <textarea id="grade-feedback" rows={3} maxLength={5000} value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-blue-500" />
        <button type="submit" disabled={busy}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {sub.status === "Graded" ? "Cập nhật điểm" : "Lưu điểm"}
        </button>
        {message && <p className="text-xs text-slate-600">{message}</p>}
      </form>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <SubmissionComments submissionId={sub.id} />
      </div>
    </div>
  );
}
