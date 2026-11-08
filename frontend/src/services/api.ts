import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { Session } from "./auth";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL,
  timeout: 10000,
});

const REFRESH_KEY = "eduline.refreshToken";
let accessToken: string | null = null;
let refreshing: Promise<string> | null = null;

export const tokenStore = {
  getAccess: () => accessToken,
  getRefresh: () => {
    try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
  },
  set: (tokens: { accessToken: string; refreshToken: string }) => {
    accessToken = tokens.accessToken;
    try { localStorage.setItem(REFRESH_KEY, tokens.refreshToken); } catch { /* storage can be disabled */ }
  },
  clear: () => {
    accessToken = null;
    try { localStorage.removeItem(REFRESH_KEY); } catch { /* storage can be disabled */ }
  },
};

export function refreshAccessToken() {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return Promise.reject(new Error("No saved session"));
  refreshing ??= axios.post(`${baseURL}/auth/refresh`, { refreshToken }, { timeout: 10000 })
    .then(({ data }) => {
      tokenStore.set(data);
      return data.accessToken as string;
    })
    .catch((error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) tokenStore.clear();
      throw error;
    })
    .finally(() => { refreshing = null; });
  return refreshing;
}

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(undefined, async (error) => {
  const config = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
  if (error.response?.status !== 401 || !config || config._retried || config.url?.startsWith("/auth/")) throw error;
  config._retried = true;
  try {
    config.headers.Authorization = `Bearer ${await refreshAccessToken()}`;
    return api(config);
  } catch (refreshError) {
    tokenStore.clear();
    window.dispatchEvent(new Event("eduline:session-expired"));
    throw refreshError;
  }
});
