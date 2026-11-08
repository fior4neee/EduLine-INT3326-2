import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useAuth } from "../auth/auth-context";
import { getErrorMessage } from "../services/api";
import {
  decideInstructorRequest,
  listUsers,
  setAccountType,
  type AccountType,
  type AdminUsersQuery,
  type Paginated,
  type User,
} from "../services/auth";
import { ROLE_BADGE, ROLE_LABEL } from "../lib/roles";

const FILTERS: Array<{ label: string; query: AdminUsersQuery }> = [
  { label: "Tất cả", query: {} },
  { label: "Chờ duyệt giảng viên", query: { instructorRequestStatus: "Pending" } },
  { label: "Học viên", query: { accountType: "Student" } },
  { label: "Giảng viên", query: { accountType: "Instructor" } },
  { label: "Admin", query: { accountType: "Admin" } },
];

const REQUEST_LABEL: Record<string, string> = {
  Pending: "Đang chờ",
  Approved: "Đã duyệt",
  Rejected: "Đã từ chối",
};

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [filter, setFilter] = useState(0);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(
        await listUsers({ ...FILTERS[filter].query, q: q || undefined, page, pageSize: PAGE_SIZE }),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter, q, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (userId: string, action: () => Promise<unknown>) => {
    setBusyId(userId);
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    setQ(search.trim());
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.meta.total / PAGE_SIZE)) : 1;

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 lg:px-10">
      <h1 className="text-3xl font-extrabold text-slate-900">Quản lý người dùng</h1>
      <p className="mt-2 text-sm text-slate-500">
        Duyệt yêu cầu giảng viên và đổi vai trò tài khoản. Sau khi được duyệt, người dùng bấm “Kiểm tra lại” ở
        trang tài khoản (hoặc đăng nhập lại) để nhận vai trò mới.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f, i) => (
          <button
            key={f.label}
            type="button"
            onClick={() => {
              setFilter(i);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === i ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}

        <form onSubmit={onSearch} className="ml-auto flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2">
          <Search size={16} className="text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tên, username, email…"
            aria-label="Tìm người dùng"
            className="w-48 bg-transparent text-sm outline-none"
          />
        </form>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3">Yêu cầu giảng viên</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && !result && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {result?.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Không có người dùng nào.
                </td>
              </tr>
            )}
            {result?.data.map((u) => {
              const isMe = u.id === me?.id;
              const busy = busyId === u.id;
              return (
                <tr key={u.id} className="align-middle">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {u.lastName} {u.firstName} {isMe && <span className="text-xs text-slate-400">(bạn)</span>}
                    </div>
                    <div className="text-xs text-slate-500">@{u.username}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE[u.accountType]}`}>
                      {ROLE_LABEL[u.accountType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {u.instructorRequestStatus ? REQUEST_LABEL[u.instructorRequestStatus] : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {u.instructorRequestStatus === "Pending" && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => act(u.id, () => decideInstructorRequest(u.id, true))}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <Check size={14} /> Duyệt
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => act(u.id, () => decideInstructorRequest(u.id, false))}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            <X size={14} /> Từ chối
                          </button>
                        </>
                      )}
                      <select
                        aria-label={`Vai trò của ${u.username}`}
                        value={u.accountType}
                        disabled={isMe || busy}
                        title={isMe ? "Bạn không thể tự đổi vai trò" : "Đổi vai trò"}
                        onChange={(e) =>
                          act(u.id, () => setAccountType(u.id, e.target.value as AccountType))
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-50"
                      >
                        <option value="Student">Học viên</option>
                        <option value="Instructor">Giảng viên</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {result && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>{result.meta.total} người dùng</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Trang trước"
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Trang {page}/{totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Trang sau"
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
