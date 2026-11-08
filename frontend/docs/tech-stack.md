# Frontend Tech Stack

This is the index of every framework, library and tool in `frontend/`, with its version and whether the code uses it yet. Each linked page explains what the tool does here, where it is configured, and how to work with it.

Versions are the ones installed from `package-lock.json` on 02/11/2026.

| Area | Tool | Version | Status | Page |
|---|---|---|---|---|
| Build tool and dev server | Vite | 8.3 | In use | [vite.md](vite.md) |
| UI library | React | 19.3 | In use | [react.md](react.md) |
| Language | TypeScript | 5.9 | In use | [typescript.md](typescript.md) |
| Routing | React Router | 7.18 | In use | [routing.md](routing.md) |
| Styling | Tailwind CSS | 4.3 | In use | [styling.md](styling.md) |
| UI components | shadcn/ui + Base UI + CVA + `cn` | shadcn 4.21, Base UI 1.9 | Generated, **not usable yet** (wrong folder) | [ui-components.md](ui-components.md) |
| Icons | Lucide React | 1.55 | In use | [ui-components.md](ui-components.md#icons-lucide-react) |
| HTTP client | Axios | 1.20 | Configured, not called yet | [data-fetching.md](data-fetching.md) |
| Server state | TanStack Query | 5.104 | Installed, not used | [data-fetching.md](data-fetching.md#tanstack-query) |
| Forms and validation | React Hook Form + Zod | 7.90 / 4.6 | Installed, not used | [forms.md](forms.md) |
| Charts | Recharts | 3.10 | Installed, not used | [charts.md](charts.md) |
| Linting and formatting | Oxlint + Prettier | 1.87 / 3.9 | Oxlint in use; Prettier has no config or script | [linting-formatting.md](linting-formatting.md) |
| Container | Docker | none | **Not set up** | [docker.md](docker.md) |

## Requirements

- **Node.js 20.19+ or 22.12+.** Vite 8 refuses to run on older versions. Node 22 LTS is recommended.
- npm (comes with Node).

## Commands

Run these from `frontend/`:

| Command | What it does |
|---|---|
| `npm install` | Installs the exact versions in `package-lock.json` |
| `npm run dev` | Starts the Vite dev server at http://localhost:5173 with hot reload |
| `npm run build` | Type-checks with `tsc -b`, then builds static files into `dist/` |
| `npm run preview` | Serves the built `dist/` locally to check a production build |
| `npm run lint` | Runs Oxlint over the project |

## Known issues (02/11/2026)

1. **shadcn components are in the wrong folder.** They were generated into `frontend/@/` (a folder literally named `@`) instead of `frontend/src/`. Imports like `@/components/ui/button` point at `src/components/ui/`, so none of them can be imported yet. See [ui-components.md](ui-components.md#known-issue-components-are-in-the-wrong-folder).
2. **The project uses Vite + React, but the [root README](../../README.md) still says Next.js.** The team needs to update one or the other.
3. **The Axios client sends cookies (`withCredentials: true`)**, but the backend decided tokens go in the `Authorization: Bearer` header. See [data-fetching.md](data-fetching.md#authentication-header).
4. **The register form doesn't match the backend yet:** it has no username or first/last name, has a role picker, and checks only for 8 or more characters. See [forms.md](forms.md#register-form-vs-backend).
5. **No Dockerfile.** See [docker.md](docker.md).
