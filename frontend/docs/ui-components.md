# UI Components (shadcn/ui, Base UI, CVA, cn, Lucide)

Reusable UI building blocks (buttons, dialogs, inputs, tabs) come from **shadcn/ui**. Unlike a normal library, shadcn copies each component's source code into the project, so the team owns it and can edit it freely.

**Config:** [`components.json`](../components.json)

## How the pieces fit

| Package | Version | Role |
|---|---|---|
| `shadcn` | 4.21 | Command-line tool that copies component source into the project |
| `@base-ui/react` | 1.9 | Unstyled, accessible primitives that the components wrap (focus handling, keyboard navigation, ARIA) |
| `class-variance-authority` (CVA) | 0.7 | Declares style variants, for example `<Button variant="outline" size="sm">` |
| `cn` | 0.4 | Merges Tailwind class names and resolves conflicts (a drop-in replacement for `clsx` + `tailwind-merge`) |
| `lucide-react` | 1.55 | Icons |

`components.json` settings: style `base-nova` (the Base UI flavor of shadcn), base color `neutral`, CSS variables on, icon library `lucide`, aliases `@/components`, `@/components/ui`, `@/lib/utils`, `@/hooks`.

## Components generated so far

`badge`, `button`, `card`, `dialog`, `input`, `progress`, `skeleton`, `table`, `tabs`.

The current pages do not use them yet. They are styled with plain Tailwind classes.

## Known issue: components are in the wrong folder

The components were generated into **`frontend/@/components/ui/`** and **`frontend/@/lib/utils.ts`**, in a folder literally named `@`. The `@` alias points at `src/`, so `import { Button } from "@/components/ui/button"` looks in `src/components/ui/` and fails. `tsconfig.app.json` also only checks `src/`, so these files are never type-checked.

**Fix:** move the folders into `src/` and delete the `@` folder:

```bash
# from frontend/
git mv @/components/ui src/components/ui
git mv @/lib src/lib
```

Then:
- In each component, change `import { cn } from "cn"` to `import { cn } from "@/lib/utils"`. That is what shadcn expects, and it keeps one place to swap the helper later.
- Run `npm run build` to confirm everything type-checks.

## Adding a component

```bash
npx shadcn@latest add select
```

The tool reads `components.json` and writes `src/components/ui/select.tsx` (after the fix above). Commit the generated file like any other source file.

## CVA variants

```tsx
const buttonVariants = cva("inline-flex items-center …", {
  variants: {
    variant: { default: "bg-primary …", outline: "border-border …" },
    size: { default: "h-9 px-4", sm: "h-8 px-3" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
```

Add a new look as a variant here instead of overriding classes at every call site.

## cn (class merging)

```tsx
<div className={cn("px-4 py-2", isActive && "bg-blue-600", className)} />
```

`cn` drops falsy values, and when two classes conflict the last one wins (`cn("px-4", "px-6")` gives `px-6`).

## Icons (Lucide React)

Already used in `navbar.tsx` and `heroSection.tsx`:

```tsx
import { GraduationCap, Search, Menu, X, ArrowRight } from "lucide-react";
<Search className="size-4" />
```

Import each icon by name so only the icons used end up in the bundle. Browse the icons at [lucide.dev/icons](https://lucide.dev/icons).
