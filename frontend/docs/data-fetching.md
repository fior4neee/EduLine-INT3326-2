# Data Fetching (Axios, TanStack Query)

The frontend talks to the backend REST API with **Axios**. **TanStack Query** will cache those responses and track their loading and error states. Neither is wired into a page yet: pages read mock data from `src/data/courses.ts`, and login/register show placeholder messages.

## Axios

[Axios](https://axios-http.com) is the HTTP client. **Version:** 1.20 · **Client:** [`src/services/api.ts`](../src/services/api.ts)

```ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,          // 10 s
  withCredentials: true,   // see "Authentication header" below
});
```

- `VITE_API_BASE_URL` comes from `.env.development` or your `.env.local`. See [vite.md](vite.md#environment-variables).
- The backend's base path is `/api/v1`, so the variable should end in `/api/v1`, for example `http://localhost:3000/api/v1`.

### Authentication header

The backend decided that access tokens are sent in the **`Authorization: Bearer <token>`** header, not in cookies. See [backend/README.md](../../backend/README.md#2-authentication). The client therefore needs:

1. `withCredentials: true` removed.
2. A request interceptor that adds the header:

```ts
api.interceptors.request.use((config) => {
  const token = getAccessToken(); // from wherever the app keeps it
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

3. A response interceptor that, on `401`, calls `POST /auth/refresh` once with the refresh token, stores the new pair, and retries the original request. If the refresh also fails, it sends the user to `/login`.

### Error format

Every backend error has the same shape, so one helper can show messages:

```jsonc
{ "error": { "code": "COURSE_NOT_FOUND", "message": "…", "details": [], "requestId": "…" } }
```

Paged lists come back as `{ "data": [...], "meta": { "page": 1, "pageSize": 20, "total": 134 } }`.

## TanStack Query

[TanStack Query](https://tanstack.com/query) (React Query) caches server data, removes duplicate requests, and refetches when data goes stale. **Version:** 5.104 · **Status:** installed, no `QueryClientProvider` yet.

### Setup to add in `main.tsx`

```tsx
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### Usage pattern

```tsx
// reading
const { data, isPending, error } = useQuery({
  queryKey: ["courses", { page }],
  queryFn: () => api.get("/courses", { params: { page } }).then((r) => r.data),
});

// writing
const enroll = useMutation({
  mutationFn: (courseId: number) => api.post(`/courses/${courseId}/enroll`),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "courses"] }),
});
```

- Use Query for **server data** (courses, enrollments, notifications). Use `useState` only for UI state (open menus, form inputs).
- Poll the unread notification count with `refetchInterval: 30_000`, the 30-second interval the backend plan gives.
