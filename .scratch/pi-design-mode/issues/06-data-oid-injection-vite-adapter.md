Status: done

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

The Vite adapter for `data-oid` injection, reusing the shared core format from Slice 1. This is the second adapter in the `@pi-design/react-plugin` package.

The Vite plugin uses the `transform` hook in `vite.config.ts`. Since Vite doesn't use SWC by default, the AST walking uses `@babel/parser` + `@babel/traverse`. The `data-oid` format and attribute logic is identical to the SWC adapter — only the bundler registration differs.

The plugin:
- Is registered as a Vite plugin via the `plugins` array in `vite.config.ts`
- Walks JSX/TSX AST during the transform hook
- Injects `data-oid` attributes with the same format: `c:H:r:file:line:column`
- Only runs in dev mode (check `command` in the Vite plugin context)
- Injects the client script virtual module (same as SWC adapter)

## Acceptance criteria

- [ ] A Vite+React app with the plugin installed has `data-oid` attributes on every JSX element in dev mode
- [ ] The `data-oid` format is identical to the SWC adapter output
- [ ] File paths are relative to the project root
- [ ] Line and column numbers are accurate
- [ ] Same-line elements get distinct `data-oid` values
- [ ] Production builds do NOT include `data-oid` attributes
- [ ] The app compiles and runs without errors
- [ ] Tests: same fixture TSX files produce identical `data-oid` values through both SWC and Vite adapters
- [ ] Tests cover edge cases: fragments, conditional rendering, same-line multiple elements

## Blocked by

- 01-data-oid-injection-swc (needs the shared core format and design reference)
