# TypeScript

[TypeScript](https://www.typescriptlang.org) adds types to JavaScript, so mistakes such as a wrong prop name or a missing field show up in the editor and at build time instead of in the browser.

**Version:** 5.9 · **Config:** [`tsconfig.json`](../tsconfig.json), [`tsconfig.app.json`](../tsconfig.app.json), [`tsconfig.node.json`](../tsconfig.node.json)

## How the configs fit together

`tsconfig.json` only points at two sub-projects:

| File | Checks | Environment |
|---|---|---|
| `tsconfig.app.json` | Everything in `src/` | Browser (`DOM` types, `vite/client` types for `import.meta.env`) |
| `tsconfig.node.json` | `vite.config.ts` only | Node.js (`node` types) |

TypeScript **only type-checks**. Both configs set `noEmit: true`, and Vite does the actual compiling.

## Settings that affect how you write code

| Setting | Effect |
|---|---|
| `noUnusedLocals`, `noUnusedParameters` | An unused variable or parameter is an error, and `npm run build` fails. |
| `verbatimModuleSyntax` | Type-only imports must say so: `import { useState, type FormEvent } from "react"`. |
| `erasableSyntaxOnly` | No `enum`s or `namespace`s. Use union types (`"Student" \| "Instructor"`) or `as const` objects. |
| `noFallthroughCasesInSwitch` | Every non-empty `case` must end in `break` or `return`. |
| `allowImportingTsExtensions` | Imports may end in `.tsx` (as in `main.tsx`). |
| `paths: { "@/*": ["./src/*"] }` | Matches the Vite `@` alias. |

`strict` is **not** turned on, so `null` and `undefined` are not checked strictly. Turning it on early, before the codebase grows, is cheaper than later.

## Checking types

- `npm run build` type-checks first and stops on errors.
- `npx tsc -b` type-checks without building.
- VS Code shows the same errors as you type.

## Sharing types with the backend

The API's object shapes are documented in [backend/README.md](../../backend/README.md#3-objects), and all fields are camelCase. When API calls are added, put matching TypeScript types in `src/types/` (for example `Course`, `User`, `Enrollment`) and replace the mock `Course` type in `src/data/courses.ts`.
