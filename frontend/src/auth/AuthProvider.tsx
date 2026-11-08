import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthContext } from "./auth-context";
import * as authApi from "../services/auth";
import { tokenStore } from "../services/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<authApi.User | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">(() => tokenStore.getRefresh() ? "loading" : "ready");

  useEffect(() => {
    if (tokenStore.getRefresh()) {
      authApi.restoreSession().then(setUser).catch(() => setUser(null)).finally(() => setStatus("ready"));
    }
    const expire = () => setUser(null);
    window.addEventListener("eduline:session-expired", expire);
    return () => window.removeEventListener("eduline:session-expired", expire);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const nextUser = await authApi.login(username, password);
    setUser(nextUser);
    return nextUser;
  }, []);
  const register = useCallback(async (input: authApi.RegisterInput) => {
    const nextUser = await authApi.register(input);
    setUser(nextUser);
    return nextUser;
  }, []);
  const logout = useCallback(async () => { await authApi.logout(); setUser(null); }, []);

  const value = useMemo(() => ({ user, status, login, register, logout }), [user, status, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
