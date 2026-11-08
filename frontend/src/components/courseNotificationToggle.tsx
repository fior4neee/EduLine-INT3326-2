import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import {
  getCourseSubscription,
  setCourseSubscription,
  type NotificationPermission,
} from "../services/notifications";

// "Receive notifications from this course?" for an enrolled student.
// Default (never answered) counts as on.
export default function CourseNotificationToggle({ courseId }: { courseId: string }) {
  const [status, setStatus] = useState<NotificationPermission | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCourseSubscription(courseId)
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [courseId]);

  if (status === null) return null;
  const on = status !== "Denied";

  const toggle = async () => {
    const next: NotificationPermission = on ? "Denied" : "Granted";
    setBusy(true);
    try {
      await setCourseSubscription(courseId, next);
      setStatus(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
    >
      {on ? <Bell size={16} className="text-blue-600" /> : <BellOff size={16} className="text-slate-400" />}
      {on ? "Đang nhận thông báo khóa học" : "Đã tắt thông báo khóa học"}
    </button>
  );
}
