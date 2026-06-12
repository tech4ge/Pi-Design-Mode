Status: ready-for-agent
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/prd-distribution-readiness.md`

## What to build

Bundle the Pi extension into a single self-contained JS file with all dependencies inlined. Replace the current approach (symlink to repo source + runtime `node_modules`).

End-to-end behaviour: after running `npm run build` in `packages/extension`, the output at `packages/extension/dist/index.js` is a single file that Pi can load directly. No `node_modules`, no symlink, no build step on the user's machine. The extension's `package.json` points to `./dist/index.js` instead of `./src/index.ts`.

Additionally, eliminate the duplicated `data-oid.ts` — the extension imports `parseDataOid` from `@pi-design/react-plugin/data-oid` at build time. Since tsup bundles everything, the import is resolved during the build. No runtime dependency on the react-plugin package.

### Changes

1. **New `packages/extension/tsup.config.ts`**: Bundle `src/index.ts` into `dist/index.js`. Inline all dependencies (Babel parser/traverse/generator, ws, typebox). Mark `@earendil-works/pi-coding-agent` as external (provided by Pi runtime).

2. **Update `packages/extension/package.json`**: Add `npm run build` script. Change `main` from `src/index.ts` to `dist/index.js`. Change `pi.extensions` from `["./src/index.ts"]` to `["./dist/index.js"]`.

3. **Delete `packages/extension/src/data-oid.ts`**: Update `src/index.ts` and `src/inspect.ts` to import `parseDataOid` from `@pi-design/react-plugin/data-oid` instead of the local copy.

4. **All 40 tests still pass**: Extension tests (16) and react-plugin tests (24) unchanged.

### Key constraint

The tsup config must mark `@earendil-works/pi-coding-agent` as external — Pi provides this at runtime. Everything else (Babel, ws, typebox) gets inlined.

## Acceptance criteria

- [ ] `npm run build` in `packages/extension` produces `dist/index.js`
- [ ] `dist/index.js` is a single file with all deps inlined (no `node_modules` needed at runtime)
- [ ] `package.json` `main` and `pi.extensions` point to `./dist/index.js`
- [ ] `packages/extension/src/data-oid.ts` deleted — imports resolved from `@pi-design/react-plugin/data-oid`
- [ ] All 40 tests pass (16 extension + 24 react-plugin)
- [ ] `dist/index.js` does not contain `@earendil-works/pi-coding-agent` source (only import reference)

## Blocked by

None — can start immediately
