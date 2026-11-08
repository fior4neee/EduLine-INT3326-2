import { createContext, useContext } from "react";
import type { User } from "../services/auth";

export interface AuthContextValue {
  user: User | null;
  status: "loading" | "ready";
  login: (username: string, password: string) => Promise<User>;
  register: (input: Parameters<typeof import("../services/auth").register>[0]) => Promise<User>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
