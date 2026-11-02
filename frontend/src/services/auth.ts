import { api, refreshSession, tokenStore } from "./api";

// Shapes from backend/README.md §3.1 and §8.

export type AccountType = "Student" | "Instructor" | "Admin";
export type InstructorRequestStatus = "Pending" | "Approved" | "Rejected" | null;

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: AccountType;
  description: string | null;
  isVerified: boolean;
  instructorRequestStatus: InstructorRequestStatus;
  enrolledCourses?: Array<{
    courseId: string;
    status: string;
    enrolledAt: string;
    progressPercentage: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterInput {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  accountType: "Student" | "Instructor";
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

export async function login(usernameOrEmail: string, password: string): Promise<User> {
  const { data } = await api.post<Session>("/auth/login", {
    username: usernameOrEmail,
    password,
  });
  tokenStore.set(data);
  return data.user;
}

export async function register(input: RegisterInput): Promise<User> {
  const { data } = await api.post<Session>("/auth/register", input);
  tokenStore.set(data);
  return data.user;
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStore.getRefresh();
  tokenStore.clear();
  if (refreshToken) {
    await api.post("/auth/logout", { refreshToken }).catch(() => undefined);
  }
}

// Gets a fresh access token, which also carries the current role
// (for example right after an Admin approves an instructor request).
export async function restoreSession(): Promise<User> {
  return (await refreshSession()).user;
}

export async function requestInstructorRole(): Promise<User> {
  return (await api.post<User>("/users/me/instructor-request")).data;
}

// ─── Admin ─────────────────────────────────────────────────────────────────

export interface AdminUsersQuery {
  page?: number;
  pageSize?: number;
  accountType?: AccountType;
  instructorRequestStatus?: "Pending" | "Approved" | "Rejected";
  q?: string;
}

export async function listUsers(query: AdminUsersQuery): Promise<Paginated<User>> {
  return (await api.get<Paginated<User>>("/admin/users", { params: query })).data;
}

export async function decideInstructorRequest(userId: string, approve: boolean): Promise<User> {
  const action = approve ? "approve" : "reject";
  return (await api.post<User>(`/admin/users/${userId}/instructor-request/${action}`)).data;
}

export async function setAccountType(userId: string, accountType: AccountType): Promise<User> {
  return (await api.patch<User>(`/admin/users/${userId}`, { accountType })).data;
}
