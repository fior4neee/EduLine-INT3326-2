# Routing (React Router)

[React Router](https://reactrouter.com) maps the URL to the page component, entirely in the browser: clicking a link changes the page without a full reload.

**Version:** 7.18 (`react-router-dom`, used in declarative mode) · **Routes:** [`src/App.tsx`](../src/App.tsx)

## Current routes

| Path | Component | Layout | Status |
|---|---|---|---|
| `/` | `HomePage` (hero + featured courses) | `MainLayout` (with navbar) | Built |
| `/courses` | `PlaceholderPage` "Khóa học" | `MainLayout` | Placeholder |
| `/instructors` | `PlaceholderPage` "Giảng viên" | `MainLayout` | Placeholder |
| `/about` | `PlaceholderPage` "Về chúng tôi" | `MainLayout` | Placeholder |
| `/login` | `LoginPage` | none (full screen) | UI only, no API call |
| `/register` | `RegisterPage` | none (full screen) | UI only, no API call |

There is no catch-all `*` route yet, so an unknown URL renders an empty page. Add a 404 page.

## How layouts work

```tsx
<Route element={<MainLayout />}>          {/* renders <Navbar /> + <Outlet /> */}
  <Route path="/" element={<HomePage />} />
</Route>
<Route path="/login" element={<LoginPage />} />   {/* no navbar */}
```

A parent route with no `path` acts as a layout. Its `<Outlet />` is where the matching child page appears.

## Navigating

- In markup, use `<Link to="/register">` or `<NavLink>` (adds an active class). Never use `<a href>` for internal pages, because it reloads the whole app.
- In code, use `const navigate = useNavigate(); navigate("/login")`.

## URL plan from the backend

The agreed URL style uses numeric IDs: `/courses/1234`, `/courses/1234/lessons/9905`. Notifications link to these routes through `actionUrl`. Planned routes:

| Path | Page |
|---|---|
| `/courses/:courseId` | Course detail and outline |
| `/courses/:courseId/lessons/:lessonId` | Lesson viewer |
| `/courses/:courseId/:tab` | Course tabs (for example `files`, `assignments`) |
| `/me/courses` | My Courses |

Read parameters with `const { courseId } = useParams()`.

## Hosting note

`BrowserRouter` uses real paths (`/courses/1234`), not `#` URLs. Whatever serves the built app must return `index.html` for every path, or refreshing on `/login` returns a 404. `npm run dev` and `npm run preview` already do this. The proposed nginx config in [docker.md](docker.md) does too.
