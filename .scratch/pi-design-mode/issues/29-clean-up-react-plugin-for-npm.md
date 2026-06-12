Status: ready-for-agent
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/prd-distribution-readiness.md`

## What to build

Clean up `@pi-design/react-plugin` so that `npm publish` and `npm pack` only ship built JS files — no source, tests, config, or sourcemaps.

End-to-end behaviour: running `npm pack --dry-run` in `packages/react-plugin` shows only `dist/*.js` and `package.json` in the tarball. A consumer who installs the package gets only what they need to run it.

### Changes

1. **Add `"files": ["dist"]`** to `packages/react-plugin/package.json`. This tells npm to only include the `dist/` directory in the published package.

2. **Add `packages/react-plugin/.npmignore`**: Exclude `src/`, `tests/`, `tsup.config.ts`, `*.map`, `node_modules/`. Belt-and-suspenders with the `files` field — ensures nothing leaks even if `files` is removed later.

3. **Verify `npm pack --dry-run`** shows only:
   - `package.json`
   - `dist/index.js`
   - `dist/vite-plugin.js`
   - `dist/data-oid.js`
   - `dist/transform.js`
   - `dist/next.js`
   - `dist/browser-client.js`
   - Shared chunks (`dist/chunk-*.js`)
   
   No `*.map`, no `src/`, no `tests/`.

## Acceptance criteria

- [ ] `package.json` has `"files": ["dist"]` field
- [ ] `.npmignore` exists and excludes src/, tests/, *.map, tsup.config.ts
- [ ] `npm pack --dry-run` shows only dist/*.js + package.json (no maps, no source, no config)

## Blocked by

None — can start immediately
