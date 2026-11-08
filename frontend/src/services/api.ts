import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { Session } from "./auth";

const baseURL = import.meta.env.VITE_API_BASE_URL;

// Tokens travel in the "Authorization: Bearer" header, not cookies (backend README §2).
export const api = axios.create({ baseURL, timeout: 10000 });

// ─── Token storage ─────────────────────────────────────────────────────────
// Access token: memory only (lost on reload, lives 15 minutes).
// Refresh token: localStorage, so a page reload keeps you logged in.
// Trade-off (ADR-008): localStorage is readable by an XSS bug. Revisit with M1.

const REFRESH_KEY = "eduline.refreshToken";
let accessToken: string | null = null;

export const tokenStore = {
  getAccess: () => accessToken,
  getRefresh(): string | null {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set(tokens: { accessToken: string; refreshToken: string }) {
    accessToken = tokens.accessToken;
    try {
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    } catch {
      // Private mode: the session simply ends on reload.
    }
  },
  clear() {
    accessToken = null;
    try {
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      // ignore
    }
  },
};

// ─── Refresh ───────────────────────────────────────────────────────────────
// Refresh tokens are single use. Two refreshes in parallel would look like a
// stolen token and end the session, so every caller shares one request.

let refreshing: Promise<Session> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export function refreshSession(): Promise<Session> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return Promise.reject(new Error("No saved session"));

  refreshing ??= axios
    .post<Session>(`${baseURL}/auth/refresh`, { refreshToken }, { timeout: 10000 })
    .then((res) => {
      tokenStore.set(res.data);
      return res.data;
    })
    .catch((err) => {
      // Only a rejected token ends the session; a network error keeps it for a retry.
      if (axios.isAxiosError(err) && err.response?.status === 401) tokenStore.clear();
      throw err;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, refresh once and retry the request. Auth routes are never retried.
api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  const isAuthRoute = config?.url?.startsWith("/auth/");
  if (error.response?.status !== 401 || !config || config._retried || isAuthRoute) {
    throw error;
  }
  config._retried = true;
  try {
    await refreshSession();
  } catch {
    tokenStore.clear();
    onSessionExpired?.();
    throw error;
  }
  return api(config);
});

// ─── Errors ────────────────────────────────────────────────────────────────
// Backend errors: { error: { code, message, details, requestId } }.

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field?: string; errors?: string[] }>;
  };
}

const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Tên đăng nhập/email hoặc mật khẩu không đúng.",
  USERNAME_TAKEN: "Tên đăng nhập này đã có người dùng.",
  EMAIL_TAKEN: "Email này đã được đăng ký.",
  RATE_LIMITED: "Bạn đã thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.",
  UNAUTHENTICATED: "Vui lòng đăng nhập.",
  INVALID_ACCESS_TOKEN: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  REFRESH_TOKEN_REUSED: "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.",
  REFRESH_TOKEN_EXPIRED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  FORBIDDEN_ROLE: "Tài khoản của bạn không có quyền làm việc này.",
  CANNOT_CHANGE_OWN_ROLE: "Admin không thể tự đổi vai trò của chính mình.",
  NO_PENDING_REQUEST: "Người dùng này không có yêu cầu giảng viên đang chờ.",
  REQUEST_ALREADY_PENDING: "Yêu cầu giảng viên của bạn đang chờ Admin duyệt.",
  NOT_A_STUDENT: "Chỉ tài khoản học viên mới gửi được yêu cầu giảng viên.",
  USER_NOT_FOUND: "Không tìm thấy người dùng.",
  COURSE_NOT_FOUND: "Không tìm thấy khóa học.",
  ALREADY_ENROLLED: "Bạn đã đăng ký khóa học này rồi.",
  ENROLLMENT_SUSPENDED: "Bạn đã bị đình chỉ khỏi khóa học này.",
  PREREQUISITES_NOT_MET: "Bạn cần hoàn thành các khóa học tiên quyết trước.",
  INVALID_COURSE_PASSWORD: "Mật khẩu khóa học không đúng.",
  ENROLLMENT_NOT_OPEN_YET: "Khóa học chưa mở đăng ký.",
  ENROLLMENT_CLOSED: "Khóa học đã hết hạn đăng ký.",
  COURSE_NOT_OPEN: "Khóa học này hiện không mở đăng ký.",
  CANNOT_DROP: "Không thể hủy đăng ký ở trạng thái hiện tại.",
  NOT_ENROLLED: "Bạn chưa đăng ký khóa học này.",
  COURSE_HAS_NO_LESSONS: "Cần ít nhất một chương có bài học trước khi xuất bản.",
  COURSE_PASSWORD_REQUIRED: "Hãy đặt mật khẩu khóa học trước khi xuất bản có mật khẩu.",
  COURSE_STAFF_ONLY: "Chỉ giảng viên của khóa học hoặc Admin mới làm được việc này.",
  SUSPENSION_NOT_ALLOWED: "Chỉ đình chỉ được học viên đã đăng ký từ 2 lần trở lên và chưa hoàn thành khóa học.",
  NOT_SUSPENDED: "Học viên này không bị đình chỉ.",
  SLUG_TAKEN: "Đường dẫn (slug) này đã được khóa học khác dùng.",
  LESSON_NOT_FOUND: "Không tìm thấy bài học.",
  LESSON_LOCKED: "Hãy đăng ký khóa học để xem bài học này.",
  PROGRESS_NOT_ALLOWED: "Tiến độ chỉ được lưu cho học viên đang học khóa này.",
  LESSON_TYPE_NOT_SUPPORTED: "Loại bài học này không dùng thao tác đó.",
  INVALID_PROGRESS: "Dữ liệu tiến độ không hợp lệ.",
  ASSIGNMENT_NOT_FOUND: "Không tìm thấy bài tập.",
  SUBMISSION_NOT_FOUND: "Không tìm thấy bài nộp.",
  SUBMISSION_TYPE_NOT_ALLOWED: "Bài tập này không nhận hình thức nộp đó.",
  FILE_TYPE_NOT_ALLOWED: "Loại tệp này không được chấp nhận.",
  ASSIGNMENT_NOT_OPEN: "Bài tập chưa mở.",
  ASSIGNMENT_CLOSED: "Đã hết hạn nộp và giảng viên không nhận bài muộn.",
  ALREADY_GRADED: "Bài đã được chấm, không thể nộp lại.",
  SUBMISSION_NOT_ALLOWED: "Chỉ học viên đang học khóa này mới nộp được bài.",
  SCORE_OUT_OF_RANGE: "Điểm vượt quá điểm tối đa của bài tập.",
  INVALID_ASSIGNMENT_DATES: "Ngày mở phải trước hạn nộp.",
  COMMENT_NOT_ALLOWED: "Bạn không thể bình luận ở đây nữa.",
  NOTIFICATION_NOT_FOUND: "Không tìm thấy thông báo.",
};

const FIELD_LABELS: Record<string, string> = {
  username: "Tên đăng nhập",
  firstName: "Tên",
  lastName: "Họ",
  email: "Email",
  password: "Mật khẩu",
  title: "Tên khóa học",
  coursePassword: "Mật khẩu khóa học",
  thumbnailUrl: "Ảnh bìa",
};

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return "Không kết nối được máy chủ. Backend có đang chạy ở cổng 8000 không?";
    }
    const body = (err.response.data as ApiErrorBody | undefined)?.error;
    if (body?.code === "VALIDATION_FAILED" && body.details?.length) {
      return body.details
        .map((d) => `${FIELD_LABELS[d.field ?? ""] ?? d.field}: ${(d.errors ?? []).join(", ")}`)
        .join("\n");
    }
    if (body?.code && MESSAGES[body.code]) return MESSAGES[body.code];
    if (body?.message) return body.message;
  }
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}
