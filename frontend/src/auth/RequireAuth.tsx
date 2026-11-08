import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { AccountType } from "../services/auth";
import { useAuth } from "./auth-context";

// Sends visitors who are not logged in to /login, and blocks other roles.
export default function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: AccountType[];
}) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <main className="mx-auto max-w-5xl px-6 py-16 text-slate-500">Đang tải…</main>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.accountType)) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-2xl font-bold text-slate-900">Không có quyền truy cập</h1>
        <p className="mt-2 text-slate-500">Trang này chỉ dành cho: {roles.join(", ")}.</p>
      </main>
    );
  }
  return <>{children}</>;
}
