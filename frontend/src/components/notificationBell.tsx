import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import {
  announceNotificationsChanged,
  getUnreadCount,
  listNotifications,
  markAllRead,
  NOTIFICATIONS_CHANGED,
  type AppNotification,
} from "../services/notifications";
import NotificationItem from "./notificationItem";

const POLL_MS = 30_000;

// Bell with an unread badge (checked every 30 s) and a dropdown of the latest notifications.
export default function NotificationBell() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    getUnreadCount()
      .then(setCount)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(refreshCount, POLL_MS);
    const onFocus = () => refreshCount();
    window.addEventListener("focus", onFocus);
    window.addEventListener(NOTIFICATIONS_CHANGED, onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(NOTIFICATIONS_CHANGED, onFocus);
    };
  }, [refreshCount]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setItems(null);
      try {
        setItems((await listNotifications({ pageSize: 8 })).data);
        refreshCount();
      } catch {
        setItems([]);
      }
    }
  };

  // Opens the notification in the inbox, which marks it read.
  const openItem = (n: AppNotification) => {
    setOpen(false);
    navigate(`/notifications?id=${n.id}`);
  };

  const readAll = async () => {
    await markAllRead().catch(() => undefined);
    setItems((list) => list?.map((n) => ({ ...n, isRead: true })) ?? null);
    setCount(0);
    announceNotificationsChanged();
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={count > 0 ? `Thông báo (${count} chưa đọc)` : "Thông báo"}
        aria-expanded={open}
        className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-bold text-slate-900">Thông báo</p>
            {count > 0 && (
              <button type="button" onClick={readAll} className="text-xs font-semibold text-blue-600 hover:underline">
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items === null && <p className="px-4 py-6 text-center text-sm text-slate-400">Đang tải…</p>}
            {items?.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Bạn chưa có thông báo nào.</p>
            )}
            {items?.map((n) => <NotificationItem key={n.id} notification={n} onClick={() => openItem(n)} compact />)}
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 py-3 text-center text-sm font-semibold text-blue-600 hover:bg-slate-50"
          >
            Mở hộp thư
          </Link>
        </div>
      )}
    </div>
  );
}
