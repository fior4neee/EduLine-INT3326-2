import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context";

export default function RequireAuth({ children, studentOnly = false }: { children: ReactNode; studentOnly?: boolean }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <main className="mx-auto max-w-6xl px-6 py-16 text-slate-500">Đang khôi phục phiên đăng nhập…</main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (studentOnly && user.accountType !== "Student") return <Navigate to="/" replace />;
  return <>{children}</>;
}
