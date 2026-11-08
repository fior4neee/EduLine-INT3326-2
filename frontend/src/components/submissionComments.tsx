import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { useAuth } from "../auth/auth-context";
import { getErrorMessage } from "../services/api";
import { addComment, formatDateTime, listComments, type Comment } from "../services/assignments";

// Private thread on one submission between the student and the course staff.
export default function SubmissionComments({ submissionId }: { submissionId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Only the newest request may update the list, so a slow first load cannot
  // overwrite a comment that was just posted.
  const latest = useRef(0);
  const load = useCallback(async () => {
    const id = ++latest.current;
    try {
      const list = await listComments(submissionId);
      if (id === latest.current) setComments(list);
    } catch (err) {
      if (id === latest.current) setError(getErrorMessage(err));
    }
  }, [submissionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      await addComment(submissionId, body.trim());
      setBody("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-bold text-slate-900">Bình luận</p>
      <div className="mt-2 space-y-2">
        {comments?.length === 0 && <p className="text-xs text-slate-400">Chưa có bình luận.</p>}
        {comments?.map((c) => {
          const mine = c.author.id === user?.id;
          return (
            <div key={c.id} className={`rounded-xl p-3 text-sm ${mine ? "bg-blue-50" : "bg-slate-50"}`}>
              <p className="text-xs font-semibold text-slate-600">
                {c.author.lastName} {c.author.firstName}
                {c.author.accountType !== "Student" && (
                  <span className="ml-1.5 rounded bg-white px-1.5 py-0.5 text-[10px] text-violet-700">Giảng viên</span>
                )}
                <span className="ml-2 font-normal text-slate-400">{formatDateTime(c.createdAt)}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-slate-800">{c.body}</p>
            </div>
          );
        })}
      </div>
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={2}
          placeholder="Viết bình luận…"
          aria-label="Viết bình luận"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={busy || !body.trim()}
          aria-label="Gửi bình luận"
          className="self-end rounded-xl bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
