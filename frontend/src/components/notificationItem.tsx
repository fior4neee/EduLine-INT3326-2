import { Bell } from "lucide-react";
import { TYPE_ICON } from "../lib/notification-types";
import { timeAgo, type AppNotification } from "../services/notifications";

export default function NotificationItem({
  notification: n,
  onClick,
  compact = false,
  selected = false,
}: {
  notification: AppNotification;
  onClick: () => void;
  compact?: boolean;
  selected?: boolean;
}) {
  const Icon = TYPE_ICON[n.type] ?? Bell;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected || undefined}
      className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
        selected ? "bg-blue-100/70 hover:bg-blue-100/70" : n.isRead ? "" : "bg-blue-50/50"
      }`}
    >
      <div className="relative shrink-0">
        {n.imageUrl ? (
          <img src={n.imageUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Icon size={20} />
          </span>
        )}
        {n.imageUrl && (
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-blue-600 shadow">
            <Icon size={12} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${n.isRead ? "text-slate-700" : "font-semibold text-slate-900"}`}>{n.title}</p>
        <p className={`mt-0.5 text-sm text-slate-500 ${compact ? "line-clamp-2" : "line-clamp-1"}`}>{n.messageBody}</p>
        <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
      </div>
      {!n.isRead && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" aria-label="Chưa đọc" />}
    </button>
  );
}
