# Styling (Tailwind CSS)

[Tailwind CSS](https://tailwindcss.com) styles elements with small utility classes written directly in the markup, for example `className="mx-auto max-w-7xl px-6 py-12"`, instead of separate CSS files.

**Version:** 4.3 · **Global CSS:** [`src/index.css`](../src/index.css) · **Plugin:** `@tailwindcss/vite` in [`vite.config.ts`](../vite.config.ts)

## Setup (Tailwind v4)

Version 4 needs **no `tailwind.config.js` and no PostCSS config**. The whole setup is one line in `src/index.css`:

```css
@import "tailwindcss";
```

Tailwind scans the source files for class names and generates only the CSS that is used.

To customize colors, fonts or breakpoints, add an `@theme` block in `index.css`. Do not create a config file:

```css
@theme {
  --color-brand: #2563eb;   /* gives bg-brand, text-brand, … */
}
```

## Global styles

`src/index.css` also sets smooth scrolling, a white background, slate-900 text (`#0f172a`), a minimum width of 320 px, and a full-height `#root`. `src/App.css` exists but is not imported anywhere, so it can be deleted.

## Conventions

- Mobile first: unprefixed classes apply to all sizes, and `md:` / `lg:` add styles for larger screens.
- Colors in use come from the default palette (`slate`, blue accents).
- For classes that change with props or state, use `cn(...)` (see [ui-components.md](ui-components.md#cn-class-merging)) so conflicting classes resolve correctly.

## Related packages

| Package | Purpose | Status |
|---|---|---|
| `tw-animate-css` | Ready-made enter/exit animation classes used by shadcn components (dialogs, menus) | Installed, not imported in `index.css` yet |
| `@fontsource-variable/geist` | Self-hosted Geist font (no Google Fonts request) | Installed, not imported yet |

To use them, add the following to `src/index.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@fontsource-variable/geist";

@theme {
  --font-sans: "Geist Variable", sans-serif;
}
```

## Editor setup

Install the **Tailwind CSS IntelliSense** extension for VS Code to get class autocomplete and hover previews.
