# Vite

[Vite](https://vite.dev) is the dev server and build tool. In development it serves source files directly to the browser and reloads instantly on save. For production it bundles everything into static HTML, JS and CSS in `dist/`.

**Version:** 8.3 · **Config:** [`vite.config.ts`](../vite.config.ts) · **Entry page:** [`index.html`](../index.html)

## Configuration

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

| Setting | Purpose |
|---|---|
| `@vitejs/plugin-react` | Compiles JSX/TSX and enables React Fast Refresh (edits keep component state) |
| `@tailwindcss/vite` | Runs Tailwind CSS v4 inside the Vite pipeline; no `tailwind.config.js` or PostCSS config is needed |
| Alias `@` → `src/` | `import x from "@/components/navbar"` means `src/components/navbar`. The same alias is declared in `tsconfig.app.json` so TypeScript agrees. |

## How the app starts

1. The browser loads `index.html`. Its page title is "EduLine | Nền tảng học trực tuyến".
2. `index.html` loads `/src/main.tsx` as a module.
3. `main.tsx` mounts `<App />` into `<div id="root">`. See [react.md](react.md).

## Scripts

| Command | What happens |
|---|---|
| `npm run dev` | Dev server on http://localhost:5173 (the next free port if that one is taken) |
| `npm run build` | `tsc -b` type-checks first, and the build stops on any type error. Then `vite build` writes `dist/`. |
| `npm run preview` | Serves `dist/` on http://localhost:4173 to test the production build |

## Environment variables

Vite only exposes variables whose names start with **`VITE_`**. Code reads them through `import.meta.env`:

```ts
baseURL: import.meta.env.VITE_API_BASE_URL
```

| File | Loaded when | In git? |
|---|---|---|
| `.env.development` | `npm run dev` | Yes (already tracked) |
| `.env.local` | Always; overrides the others | No; use it for your personal settings |
| `.env.production` | `npm run build` | Not created yet |

- Variables are **inlined into the JavaScript at build time.** Changing them needs a rebuild, not just a restart of the server that hosts `dist/` (this matters for [Docker](docker.md)).
- Everything in a `VITE_` variable is visible to anyone using the site. Never put secrets in one.
- `.gitignore` ignores `.env*`. `.env.development` is tracked only because it was added before that rule.

## Static files

Files in `public/` are served as-is from the site root: `public/images/courses/reactjs_course.png` is at `/images/courses/reactjs_course.png`. Use `public/` for images referenced by URL, such as the mock course thumbnails.
