Status: done
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Next.js support by piggybacking on `swc-plugin-source-tracker` — an existing SWC WASM plugin that injects source-location attributes onto JSX elements, identical in purpose to our `data-oid` transform.

### Why this approach

Next.js uses SWC by default. Adding a `.babelrc` disables SWC and slows dev builds — unacceptable UX. The SWC plugin API requires Rust/WASM, which we wanted to avoid.

`swc-plugin-source-tracker` solves this: it's a mature SWC WASM plugin that does the same job as our Babel transform — adds `data-source="file:line:column"` onto every JSX element. Crucially, it supports a custom attribute name, so we configure it to inject `data-oid` instead of `data-source`. This means our DOM queries, client script, and widget all work unchanged.

### How it works

1. User installs `swc-plugin-source-tracker` + `@pi-design/react-plugin`
2. User adds to `next.config.js`:
   ```js
   import { withSourceTracker } from "swc-plugin-source-tracker";
   
   const nextConfig = {
     experimental: {
       swcPlugins: [
         withSourceTracker({ attr: "data-oid" })
       ],
     },
   };
   export default nextConfig;
   ```
3. SWC injects `data-oid="file:line:column"` onto every JSX element at compile time
4. Our client script finds elements via `[data-oid="..."]` — same as Vite
5. Our extension calls `parseDataOid(dataOid)` to extract file/line for `design_inspect`

### Attribute format difference

**Vite/Babel** produces: `data-oid="c:H:r:file:line:column"`
**Next.js/SWC** produces: `data-oid="file:line:column"`

The only extra info in the Babel format is:
- `c` — component type marker (always `c`, currently unused)
- `H` — 8-char project root hash (used for monorepo disambiguation, not needed for inspection)

Both formats contain the only data the extension actually uses: `file:line:column`. The extension's `parseDataOid()` must be updated to handle both formats.

### Research sources

- `swc-plugin-react-source` (https://github.com/tanchu/swc-plugin-react-source) — adds `data-source="path:line"`, Rust-based, `experimental.swcPlugins` config
- `swc-plugin-source-tracker` (npmx.dev) — adds `data-source="file:line:col"`, supports custom attr name, auto-selects v35 (Next 15 webpack) vs v54 (Next 16 Turbopack) WASM binary
- `unpeel-tagger` — adds JSON `data-unpeel` attribute with file/line/tag/component
- Next.js 16: still supports `.babelrc` but disables SWC; `experimental.swcPlugins` is the recommended path
- SWC plugins must pin exact `swc_core` version matching Next.js internal version — this is the #1 ecosystem pain point. `swc-plugin-source-tracker` handles this by shipping two WASM binaries and auto-selecting.

### Changes required

1. **`packages/react-plugin/src/data-oid.ts`**: Update `parseDataOid` to handle both `c:H:r:file:line:column` (Babel) and `file:line:column` (SWC) formats. Return same `DataOidComponents` shape — `projectHash` and `type` are optional/empty for SWC format.

2. **`packages/extension/src/data-oid.ts`**: Same `parseDataOid` update (mirror of above — currently duplicated between packages).

3. **`packages/react-plugin/src/index.ts`**: Export a `withPiDesignNext()` helper that returns the `swcPlugins` config snippet, so users don't have to manually wire it. Optionally also inject the client script via webpack config or `_app` import.

4. **Client script injection for Next.js**: The Vite plugin handles this via virtual module. For Next.js, we need an equivalent. Options:
   - **Webpack config in `next.config.js`**: Add an entry/alias for a client script module
   - **`_app.tsx`/`layout.tsx` import**: User adds `import "@pi-design/react-plugin/client"` — simplest, just a one-line import
   - **`instrumentationClientInject`**: Next.js 16 feature for injecting client scripts — worth investigating but may be too new

5. **Documentation**: README section on Next.js setup (install + config)

### What we do NOT need to build

- No Rust crate / SWC plugin — we use `swc-plugin-source-tracker` as a dependency
- No changes to the browser client script — it already queries `[data-oid="..."]`
- No changes to the extension — `design_inspect` works via `parseDataOid` which we're updating
- No changes to the Vite plugin — Babel transform unchanged

### Behaviours to test

1. `parseDataOid("src/App.tsx:12:5")` returns `{ filePath: "src/App.tsx", line: 12, column: 5, ... }`
2. `parseDataOid("c:abc12345:r:src/App.tsx:12:5")` still works (backward compat)
3. Next.js app with `swc-plugin-source-tracker` + `attr: "data-oid"` produces `data-oid` attributes on all JSX elements
4. Client script finds elements, widget shows selection, submit works
5. `design_inspect` resolves file/line from SWC-format data-oid

### Key files

- `packages/react-plugin/src/data-oid.ts` — `parseDataOid` dual-format support
- `packages/extension/src/data-oid.ts` — mirror update
- `packages/react-plugin/src/index.ts` — `withPiDesignNext()` export
- `packages/react-plugin/package.json` — add `swc-plugin-source-tracker` as peer dep

### Risks

- **Version pin fragility**: `swc-plugin-source-tracker` must match Next.js internal `swc_core` version. If Next.js upgrades and the plugin hasn't caught up, it breaks. Mitigated by the plugin shipping two WASM binaries and auto-selecting.
- **Third-party dependency**: We depend on `swc-plugin-source-tracker` being maintained. If abandoned, we'd need to fork or write our own SWC plugin. Mitigated by it being a simple plugin (~200 LOC Rust) that we could fork.
- **Attribute format divergence**: Vite and Next.js produce slightly different `data-oid` values. Any code that assumes the `c:H:r:` prefix will break. Mitigated by updating `parseDataOid` to handle both, and ensuring no other code does raw string matching on the prefix.

## Acceptance criteria

- [ ] `parseDataOid` handles both `c:H:r:file:line:column` and `file:line:column` formats
- [ ] Next.js app with `swc-plugin-source-tracker({ attr: "data-oid" })` produces working `data-oid` attributes
- [ ] Client script, widget, selection, submit all work on Next.js
- [ ] `design_inspect` resolves file/line from SWC-format data-oid
- [ ] Vite/Babel transform unaffected — full backward compat
- [ ] `withPiDesignNext()` helper exported for easy Next.js config
