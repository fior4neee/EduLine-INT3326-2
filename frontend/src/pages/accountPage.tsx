import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BadgeCheck, Clock, LogOut, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "../auth/auth-context";
import { getErrorMessage } from "../services/api";
import { ROLE_BADGE, ROLE_LABEL } from "../lib/roles";
import { requestInstructorRole } from "../services/auth";

export default function AccountPage() {
  const { user, logout, reload, setUser } = useAuth();
  const navigate = useNavigate();
  const justRegistered = (useLocation().state as { justRegistered?: boolean } | null)?.justRegistered;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!user) return null;

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const rows: Array<[string, string]> = [
    ["Họ và tên", `${user.lastName} ${user.firstName}`],
    ["Tên đăng nhập", user.username],
    ["Email", user.email],
    ["Mã tài khoản", user.id],
    ["Khóa học đã đăng ký", String(user.enrolledCourses?.length ?? 0)],
    ["Ngày tạo", new Date(user.createdAt).toLocaleString("vi-VN")],
  ];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 lg:py-14">
      {justRegistered && (
        <p className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          Tạo tài khoản thành công. Bạn đã được đăng nhập.
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Tài khoản của tôi</h1>
          <span
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${ROLE_BADGE[user.accountType]}`}
          >
            <BadgeCheck size={16} /> {ROLE_LABEL[user.accountType]}
          </span>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <LogOut size={16} /> Đăng xuất
        </button>
      </div>

      {/* Instructor request status */}
      {user.instructorRequestStatus === "Pending" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm text-amber-900">
            <Clock size={18} /> Yêu cầu trở thành giảng viên đang chờ Admin duyệt.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(reload, "Đã cập nhật trạng thái tài khoản.")}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100 disabled:opacity-60"
          >
            <RefreshCw size={15} /> Kiểm tra lại
          </button>
        </div>
      )}
      {user.instructorRequestStatus === "Rejected" && user.accountType === "Student" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 text-sm text-red-800">
            <XCircle size={18} /> Yêu cầu giảng viên đã bị từ chối.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(async () => setUser(await requestInstructorRole()), "Đã gửi lại yêu cầu.")
            }
            className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-800 shadow-sm hover:bg-red-100 disabled:opacity-60"
          >
            Gửi lại yêu cầu
          </button>
        </div>
      )}
      {user.accountType === "Student" && user.instructorRequestStatus === null && (
        <p className="mt-6 text-sm text-slate-500">
          Muốn giảng dạy trên EduLine?{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(async () => setUser(await requestInstructorRole()), "Đã gửi yêu cầu tới Admin.")
            }
            className="font-semibold text-blue-600 hover:underline"
          >
            Gửi yêu cầu trở thành giảng viên
          </button>
        </p>
      )}
      {user.accountType === "Admin" && (
        <Link
          to="/admin/users"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          <ShieldCheck size={16} /> Quản lý người dùng
        </Link>
      )}

      {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <dl className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-5 py-4 sm:grid-cols-[200px_1fr]">
            <dt className="text-sm font-medium text-slate-500">{label}</dt>
            <dd className="break-all text-sm text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
