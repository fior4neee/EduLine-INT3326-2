# React

[React](https://react.dev) builds the user interface out of components: functions that return JSX (HTML-like markup inside TypeScript).

**Version:** 19.3 (`react`, `react-dom`) · **Entry:** [`src/main.tsx`](../src/main.tsx) · **Root component:** [`src/App.tsx`](../src/App.tsx)

## Entry point

```tsx
// src/main.tsx
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`StrictMode` is on, so in development React renders each component twice and runs effects twice to expose bugs. This is expected and does not happen in production builds.

## Folder layout

| Folder | Holds | Current files |
|---|---|---|
| `src/pages/` | One component per route | `loginPage.tsx`, `registerPage.tsx` |
| `src/components/` | Reusable pieces of pages | `navbar.tsx`, `heroSection.tsx`, `featuredCourse.tsx`, `courseCard.tsx` |
| `src/data/` | Mock data until the backend exists | `courses.ts` (5 sample courses, type `Course`) |
| `src/services/` | Code that talks to the backend | `api.ts` (Axios client) |

`HomePage`, `MainLayout` and `PlaceholderPage` are defined inside `App.tsx`. See [routing.md](routing.md).

## Conventions in this codebase

- Function components only, each file with one `export default`.
- File names are camelCase (`courseCard.tsx`); component names are PascalCase (`CourseCard`).
- Local state uses `useState`. There is no global store (Redux, Zustand) yet. Server data is planned to go through [TanStack Query](data-fetching.md#tanstack-query).
- Oxlint enforces the [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) as an error. See [linting-formatting.md](linting-formatting.md).

## Not enabled

The React Compiler (automatic memoization) is not enabled because it slows down dev and build. To add it later, see the [React Compiler installation guide](https://react.dev/learn/react-compiler/installation).
