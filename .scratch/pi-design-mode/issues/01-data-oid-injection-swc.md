Status: ready-for-agent

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

The shared core of `data-oid` attribute injection plus the SWC adapter for Next.js. This is part of the npm package `@pi-design/react-plugin`.

The `data-oid` format is: `c:H:r:file:line:column`

- `c` — component type marker (future: `e` for element, `f` for fragment). Start with `c`.
- `H` — short hash of the project root path (to disambiguate monorepo packages)
- `file` — relative file path from project root
- `line` — line number in source file
- `column` — column number in source file

The SWC plugin is registered via `experimental.swcPlugins` in `next.config.js`. It walks the JSX AST during compilation and injects a `data-oid` attribute onto every JSX element. It only runs in development mode — production builds are untouched.

The plugin also injects the client script as a virtual module into the page during dev mode. (The client script itself will be built in a later slice — for now, inject a stub that does nothing, or skip the virtual module injection and add it when the client script exists.)

The project root is passed as config to the SWC plugin so that file paths are resolved relative to the project root.

## Acceptance criteria

- [ ] A Next.js app with the SWC plugin installed has `data-oid` attributes on every JSX element in the DOM when running in dev mode
- [ ] The `data-oid` format matches `c:H:r:file:line:column` spec
- [ ] File paths are relative to the project root
- [ ] Line and column numbers are accurate (verified against source file)
- [ ] Same-line elements (e.g. multiple JSX elements on one line) get distinct `data-oid` values with different columns
- [ ] Production builds (`next build`) do NOT include `data-oid` attributes
- [ ] The app compiles and runs without errors with the plugin installed
- [ ] Tests: fixture TSX files go through the transform, output is inspected for correct `data-oid` values
- [ ] Tests cover edge cases: fragments, conditional rendering, same-line multiple elements

## Blocked by

None — can start immediately.
