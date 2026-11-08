import { createContext, useContext } from "react";
import type { RegisterInput, User } from "../services/auth";

export interface AuthContextValue {
  user: User | null;
  // "loading" while a saved session is being restored after a page reload.
  status: "loading" | "ready";
  login: (usernameOrEmail: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  // Re-reads the user (and role) from the server.
  reload: () => Promise<void>;
  setUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
