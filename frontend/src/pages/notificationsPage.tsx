import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Inbox, MailOpen, Mail, Trash2 } from "lucide-react";
import NotificationItem from "../components/notificationItem";
import { ACTION_LABEL, INBOX_TABS, TYPE_ICON, TYPE_LABEL } from "../lib/notification-types";
import { getErrorMessage } from "../services/api";
import {
  announceNotificationsChanged,
  dayGroup,
  deleteNotification,
  fullDateTime,
  getNotification,
  listNotifications,
  markAllRead,
  markRead,
  markUnread,
  type AppNotification,
} from "../services/notifications";

const PAGE_SIZE = 20;

// Inbox: the list on the left, the selected notification in full on the right
// (on phones, one at a time). The selected one is in the URL (?id=ntf_…), so the
// bell can open a notification here and the back button works.
export default function NotificationsPage() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id");
  const tab = INBOX_TABS.find((t) => t.key === params.get("tab")) ?? INBOX_TABS[0];

  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // First page whenever the tab changes; "Tải thêm" appends the next ones.
  const loadPage = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const r = await listNotifications({ unread: tab.unread, types: tab.types, page: p, pageSize: PAGE_SIZE });
        setItems((cur) => (p === 1 ? r.data : [...cur, ...r.data]));
        setTotal(r.meta.total);
        setPage(p);
        setError("");
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  // Show the selected notification (it may be older than the loaded pages) and mark it read.
  useEffect(() => {
    setConfirmDelete(false);
    if (!selectedId) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let n = await getNotification(selectedId);
        if (!n.isRead) {
          n = await markRead(n.id);
          announceNotificationsChanged();
        }
        if (cancelled) return;
        setSelected(n);
        setItems((cur) => cur.map((x) => (x.id === n.id ? n : x)));
      } catch (err) {
        if (!cancelled) {
          setSelected(null);
          setError(getErrorMessage(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("id", id);
    else next.delete("id");
    setParams(next);
  };

  const switchTab = (key: string) => {
    const next = new URLSearchParams(params);
    if (key === "all") next.delete("tab");
    else next.set("tab", key);
    next.delete("id");
    setParams(next);
  };

  const toggleRead = async () => {
    if (!selected) return;
    const n = selected.isRead ? await markUnread(selected.id) : await markRead(selected.id);
    setSelected(n);
    setItems((cur) => cur.map((x) => (x.id === n.id ? n : x)));
    announceNotificationsChanged();
  };

  const remove = async () => {
    if (!selected) return;
    await deleteNotification(selected.id);
    setItems((cur) => cur.filter((x) => x.id !== selected.id));
    setTotal((t) => t - 1);
    announceNotificationsChanged();
    select(null);
  };

  const readAll = async () => {
    await markAllRead();
    announceNotificationsChanged();
    void loadPage(1);
  };

  // Group the list under "Hôm nay", "Hôm qua", …
  const groups = useMemo(() => {
    const out: Array<{ label: string; items: AppNotification[] }> = [];
    for (const n of items) {
      const label = dayGroup(n.createdAt);
      if (out.at(-1)?.label === label) out.at(-1)!.items.push(n);
      else out.push({ label, items: [n] });
    }
    return out;
  }, [items]);

  const unreadShown = items.filter((n) => !n.isRead).length;

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Hộp thư thông báo</h1>
          <p className="mt-1 text-sm text-slate-500">{total} thông báo</p>
        </div>
        <button
          type="button"
          onClick={readAll}
          disabled={unreadShown === 0 && !tab.unread}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {INBOX_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab.key === t.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 grid gap-5 lg:grid-cols-[400px_1fr]">
        {/* List */}
        <section
          className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${selectedId ? "hidden lg:block" : ""}`}
          aria-label="Danh sách thông báo"
        >
          <div className="max-h-[70vh] overflow-y-auto">
            {groups.map((g) => (
              <div key={g.label}>
                <p className="sticky top-0 z-10 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {g.label}
                </p>
                {g.items.map((n) => (
                  <NotificationItem key={n.id} notification={n} selected={n.id === selectedId} onClick={() => select(n.id)} />
                ))}
              </div>
            ))}
            {!loading && items.length === 0 && (
              <div className="p-10 text-center text-slate-400">
                <Inbox size={32} className="mx-auto" />
                <p className="mt-2 text-sm">Không có thông báo nào.</p>
              </div>
            )}
            {loading && <p className="p-4 text-center text-sm text-slate-400">Đang tải…</p>}
            {!loading && items.length < total && (
              <button
                type="button"
                onClick={() => loadPage(page + 1)}
                className="w-full py-3 text-sm font-semibold text-blue-600 hover:bg-slate-50"
              >
                Tải thêm
              </button>
            )}
          </div>
        </section>

        {/* Detail */}
        <section
          className={`min-h-[300px] rounded-2xl border border-slate-200 bg-white ${selectedId ? "" : "hidden lg:block"}`}
          aria-label="Chi tiết thông báo"
        >
          {!selected ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-10 text-center text-slate-400">
              <MailOpen size={36} />
              <p className="mt-3 text-sm">{selectedId ? "Đang tải…" : "Chọn một thông báo để xem chi tiết."}</p>
            </div>
          ) : (
            <NotificationDetail
              n={selected}
              confirmDelete={confirmDelete}
              onBack={() => select(null)}
              onToggleRead={toggleRead}
              onAskDelete={() => setConfirmDelete(true)}
              onCancelDelete={() => setConfirmDelete(false)}
              onDelete={remove}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function NotificationDetail({
  n,
  confirmDelete,
  onBack,
  onToggleRead,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  n: AppNotification;
  confirmDelete: boolean;
  onBack: () => void;
  onToggleRead: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const Icon = TYPE_ICON[n.type];
  return (
    <article className="p-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="mr-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <ArrowLeft size={16} /> Hộp thư
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Icon size={14} /> {TYPE_LABEL[n.type]}
        </span>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={onToggleRead}
            title={n.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            {n.isRead ? <Mail size={15} /> : <MailOpen size={15} />}
            {n.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
          </button>
          <button
            type="button"
            onClick={onAskDelete}
            aria-label="Xóa thông báo"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          Xóa thông báo này? Không thể hoàn tác.
          <button type="button" onClick={onDelete} className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white">
            Xóa
          </button>
          <button type="button" onClick={onCancelDelete} className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-700">
            Hủy
          </button>
        </div>
      )}

      <h2 className="mt-5 text-2xl font-extrabold leading-tight text-slate-900">{n.title}</h2>
      <p className="mt-2 text-sm text-slate-500">{fullDateTime(n.createdAt)}</p>

      {n.imageUrl && (
        <img src={n.imageUrl} alt="" className="mt-5 aspect-video w-full max-w-xl rounded-2xl object-cover" />
      )}

      <p className="mt-5 whitespace-pre-wrap text-base leading-7 text-slate-800">{n.messageBody}</p>

      {n.actionUrl && (
        <Link
          to={n.actionUrl}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {ACTION_LABEL[n.type]} <ArrowRight size={16} />
        </Link>
      )}
    </article>
  );
}
