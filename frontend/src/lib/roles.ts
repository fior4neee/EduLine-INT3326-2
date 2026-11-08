import type { AccountType } from "../services/auth";

export const ROLE_LABEL: Record<AccountType, string> = {
  Student: "Học viên",
  Instructor: "Giảng viên",
  Admin: "Quản trị viên",
};

export const ROLE_BADGE: Record<AccountType, string> = {
  Student: "bg-slate-100 text-slate-700",
  Instructor: "bg-emerald-50 text-emerald-700",
  Admin: "bg-violet-50 text-violet-700",
};
