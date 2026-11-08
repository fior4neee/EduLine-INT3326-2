import axios from "axios";
import { api, refreshAccessToken, tokenStore } from "./api";

export type AccountType = "Student" | "Instructor" | "Admin";

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: AccountType;
  description: string | null;
  enrolledCourses?: Array<{ courseId: string; status: string; enrolledAt: string; progressPercentage: number }>;
}

export interface Session { accessToken: string; refreshToken: string; user: User }
export interface RegisterInput {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  accountType: "Student" | "Instructor";
}

export async function login(username: string, password: string) {
  const { data } = await api.post<Session>("/auth/login", { username, password });
  tokenStore.set(data);
  return data.user;
}

export async function register(input: RegisterInput) {
  const { data } = await api.post<Session>("/auth/register", input);
  tokenStore.set(data);
  return data.user;
}

export async function restoreSession() {
  await refreshAccessToken();
  return (await api.get<User>("/users/me")).data;
}

export async function logout() {
  const refreshToken = tokenStore.getRefresh();
  tokenStore.clear();
  if (refreshToken) await api.post("/auth/logout", { refreshToken }).catch(() => undefined);
}

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const code = error.response?.data?.error?.code as string | undefined;
    const messages: Record<string, string> = {
      INVALID_CREDENTIALS: "Tên đăng nhập/email hoặc mật khẩu không đúng.",
      EMAIL_TAKEN: "Email này đã được đăng ký.",
      USERNAME_TAKEN: "Tên đăng nhập này đã được sử dụng.",
      VALIDATION_FAILED: "Thông tin chưa hợp lệ. Hãy kiểm tra các trường và quy tắc mật khẩu.",
      RATE_LIMITED: "Bạn đã thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.",
    };
    if (!error.response) return "Không kết nối được máy chủ. Kiểm tra backend tại cổng 8000.";
    return (code && messages[code]) || (error.response.data?.error?.message as string | undefined) || "Đã có lỗi xảy ra. Vui lòng thử lại.";
  }
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } }; status?: number } }).response;
    if (!response) return "Không kết nối được máy chủ. Kiểm tra backend tại cổng 8000.";
    return response.data?.error?.message ?? (response.status === 401 ? "Thông tin đăng nhập không chính xác." : "Đã có lỗi xảy ra. Vui lòng thử lại.");
  }
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}
