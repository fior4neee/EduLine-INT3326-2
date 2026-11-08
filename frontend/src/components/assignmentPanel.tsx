import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardList, Lock } from "lucide-react";
import { getErrorMessage } from "../services/api";
import {
  BLOCK_REASON,
  formatDateTime,
  getAssignment,
  publishAssignment,
  STATE_BADGE,
  STATE_LABEL,
  submitText,
  TYPE_LABEL,
  type Assignment,
} from "../services/assignments";
import SubmissionComments from "./submissionComments";

// Assignment view inside the lesson page, laid out like Canvas: details row,
// instructions, and a "Bài nộp" (submission) box on the side.
export default function AssignmentPanel({
  assignmentId,
  isStaff,
  onSubmitted,
}: {
  assignmentId: string;
  isStaff: boolean;
  onSubmitted: () => void;
}) {
  const [a, setA] = useState<Assignment | null>(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await getAssignment(assignmentId);
      setA(data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [assignmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !a) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>;
  if (!a) return <p className="text-slate-400">Đang tải bài tập…</p>;

  const sub = a.mySubmission ?? null;
  const acceptsText = a.submissionTypes.includes("TextEntry");
  const acceptsFile = a.submissionTypes.includes("FileUpload");
  const canSubmit = !isStaff && !a.submitBlockedReason;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await submitText(a.id, text);
      setText("");
      setNotice(sub ? "Đã nộp lại bài." : "Đã nộp bài!");
      await load();
      onSubmitted();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const details: Array<[string, string]> = [
    ["Hạn nộp", a.dueAt ? formatDateTime(a.dueAt) : "Không có"],
    ["Điểm", String(a.maxPoints)],
    [
      "Hình thức nộp",
      a.submissionTypes.map((t) => TYPE_LABEL[t]).join(" hoặc ") +
        (acceptsFile && a.allowedExtensions.length ? ` (${a.allowedExtensions.join(", ")})` : ""),
    ],
    [
      "Thời gian mở",
      `${a.unlockAt ? formatDateTime(a.unlockAt) : "Ngay khi đăng"} – ${
        !a.allowLateSubmissions && a.dueAt ? formatDateTime(a.dueAt) : "nhận bài muộn"
      }`,
    ],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0">
        {isStaff && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-violet-50 p-3 text-sm text-violet-900">
            {a.isPublished ? "Đã đăng cho học viên." : "Bản nháp: học viên chưa thấy bài tập này."}
            {!a.isPublished && (
              <button
                type="button"
                onClick={async () => {
                  await publishAssignment(a.id).catch((err) => setError(getErrorMessage(err)));
                  await load();
                }}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
              >
                Đăng bài tập
              </button>
            )}
            <Link
              to={`/instructor/assignments/${a.id}`}
              className="ml-auto rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"
            >
              Chấm bài →
            </Link>
          </div>
        )}

        <dl className="flex flex-wrap gap-x-8 gap-y-2 border-y border-slate-200 py-3 text-sm">
          {details.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="font-semibold text-slate-900">{k}</dt>
              <dd className="text-slate-600">{v}</dd>
            </div>
          ))}
        </dl>

        {a.locked ? (
          <p className="mt-5 flex items-center gap-2 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
            <Lock size={16} /> Bài tập mở từ {formatDateTime(a.unlockAt)}.
          </p>
        ) : (
          <p className="mt-5 whitespace-pre-wrap leading-7 text-slate-800">{a.instructions}</p>
        )}

        {!isStaff && (
          <div className="mt-6">
            {a.submitBlockedReason && (
              <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">{BLOCK_REASON[a.submitBlockedReason] ?? a.submitBlockedReason}</p>
            )}
            {canSubmit && acceptsText && (
              <form onSubmit={onSubmit}>
                <label htmlFor="submission-text" className="mb-2 block text-sm font-semibold text-slate-700">
                  {sub ? "Nộp lại bài (thay bài cũ)" : "Bài làm của bạn"}
                </label>
                <textarea
                  id="submission-text"
                  required
                  rows={8}
                  maxLength={50_000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Nhập bài làm…"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  disabled={busy || !text.trim()}
                  className="mt-3 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? "Đang nộp…" : sub ? "Nộp lại" : "Nộp bài"}
                </button>
              </form>
            )}
            {canSubmit && acceptsFile && (
              <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                Nộp bằng tệp {a.allowedExtensions.length ? `(${a.allowedExtensions.join(", ")})` : ""} sẽ có trong
                bản cập nhật tới.
              </p>
            )}
            {notice && <p className="mt-3 text-sm text-emerald-700">{notice}</p>}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        )}
      </div>

      {/* Submission box */}
      {!isStaff && (
        <aside className="h-fit rounded-2xl border border-slate-200 p-4">
          <p className="flex items-center gap-2 font-bold text-slate-900">
            <ClipboardList size={17} /> Bài nộp
          </p>
          {a.submissionState && (
            <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_BADGE[a.submissionState]}`}>
              {STATE_LABEL[a.submissionState]}
            </span>
          )}
          {sub && (
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <p className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" /> Nộp lúc {formatDateTime(sub.submittedAt)}
              </p>
              {sub.status === "Graded" && (
                <p className="text-base font-bold text-slate-900">
                  Điểm: {sub.score}/{a.maxPoints}
                </p>
              )}
              {sub.feedback && <p className="rounded-lg bg-emerald-50 p-2 text-emerald-900">“{sub.feedback}”</p>}
              {sub.textBody && (
                <details className="pt-1">
                  <summary className="cursor-pointer text-blue-600">Xem bài đã nộp</summary>
                  <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-slate-800">
                    {sub.textBody}
                  </p>
                </details>
              )}
            </div>
          )}
          {sub && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <SubmissionComments submissionId={sub.id} />
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
