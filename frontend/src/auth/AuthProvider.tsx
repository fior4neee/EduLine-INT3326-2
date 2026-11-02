import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { setSessionExpiredHandler, tokenStore } from "../services/api";
import * as authApi from "../services/auth";
import { AuthContext, type AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<authApi.User | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">(() =>
    tokenStore.getRefresh() ? "loading" : "ready",
  );

  // After a reload, use the saved refresh token to log back in.
  useEffect(() => {
    if (!tokenStore.getRefresh()) return;
    authApi
      .restoreSession()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setStatus("ready"));
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    return () => setSessionExpiredHandler(null);
  }, []);

  const login = useCallback(async (id: string, password: string) => {
    const u = await authApi.login(id, password);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (input: authApi.RegisterInput) => {
    const u = await authApi.register(input);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const reload = useCallback(async () => {
    setUser(await authApi.restoreSession());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, reload, setUser }),
    [user, status, login, register, logout, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
