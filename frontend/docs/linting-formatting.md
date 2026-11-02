# Linting and Formatting (Oxlint, Prettier)

**Oxlint** finds likely bugs. **Prettier** keeps formatting consistent so code reviews show only real changes.

## Oxlint

[Oxlint](https://oxc.rs/docs/guide/usage/linter) is a fast linter written in Rust that replaces ESLint here. **Version:** 1.87 · **Config:** [`.oxlintrc.json`](../.oxlintrc.json) · **Run:** `npm run lint`

```json
{
  "plugins": ["react", "typescript", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

| Rule | Why |
|---|---|
| `react/rules-of-hooks` (error) | Hooks must be called at the top level of a component, never inside `if` statements or loops |
| `react/only-export-components` (warn) | A file that exports components should export only components, or Fast Refresh loses state on edit. Exporting constants is allowed. |

**Optional upgrade:** type-aware rules (for example catching un-awaited promises). Install `oxlint-tsgolint` and add `"options": { "typeAware": true }` to `.oxlintrc.json`. See the [rules list](https://oxc.rs/docs/guide/usage/linter/rules).

## Prettier

[Prettier](https://prettier.io) formats code automatically. **Version:** 3.9 · **Status:** installed, but there is **no config file and no script**, so the codebase currently mixes styles. For example, `main.tsx` uses single quotes and no semicolons, while the pages use double quotes and semicolons.

Recommended setup:

1. Create `frontend/.prettierrc` matching the style most files already use:

    ```json
    { "semi": true, "singleQuote": false, "trailingComma": "all", "printWidth": 100 }
    ```

2. Add these scripts to `package.json`:

    ```json
    "format": "prettier --write .",
    "format:check": "prettier --check ."
    ```

3. Run `npm run format` once and commit the result as its own commit.
4. In VS Code, install the Prettier extension and turn on **Format on Save**.

## In CI

Once M5's GitHub Actions pipeline exists, the frontend job should run `npm ci`, `npm run lint`, `npm run format:check` and `npm run build`. The build step also catches type errors.
