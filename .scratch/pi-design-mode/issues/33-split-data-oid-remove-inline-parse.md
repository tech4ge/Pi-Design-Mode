Status: ready-for-agent
Category: enhancement

## Parent

prd-architectural-cleanup.md

## What to build

Split `data-oid.ts` into two files so that browser-safe functions can be imported without pulling in `node:crypto`:

1. Create `data-oid/shared.ts` — exports `parseDataOid`, `formatDataOid`, and `DataOidComponents`. No Node imports. Fully browser-safe.
2. Modify `data-oid/index.ts` — re-exports everything from `shared` and adds `hashProjectRoot` (which uses `node:crypto`).
3. Update `browser-client.ts` — remove the inline `parseDataOid` function (~15 lines) and import from `data-oid/shared` instead.
4. Update `tsup.config.ts` — add `data-oid/shared` entry if needed, or ensure the existing `data-oid` entry correctly builds both files.
5. Update `package.json` exports — add `./data-oid/shared` export path for direct browser-safe imports.
6. Add `data-oid.spec.ts` — unit tests for `parseDataOid` (all 3 OID formats + null cases) and `formatDataOid` (round-trip). These supplement the existing `transform.spec.ts` coverage.

The `@pi-design/react-plugin/data-oid` export continues to work unchanged for existing consumers (extension, transform). The browser-client IIFE build should not contain `node:crypto` or `require()` — verified by the existing `browser-client.spec.ts`.

## Acceptance criteria

- [ ] `data-oid/shared.ts` exists and exports `parseDataOid`, `formatDataOid`, `DataOidComponents` — no Node imports
- [ ] `data-oid/index.ts` re-exports from `shared` and adds `hashProjectRoot`
- [ ] `browser-client.ts` no longer has an inline `parseDataOid` — imports from `data-oid/shared`
- [ ] All existing tests pass: `transform.spec.ts`, `vite-plugin.spec.ts`, `browser-client.spec.ts`, `bundle.spec.ts`, `inspect.spec.ts`, `server.spec.ts`
- [ ] New `data-oid.spec.ts` covers `parseDataOid` (Babel format, SWC file:line:column, SWC file:line, null cases) and `formatDataOid` round-trip
- [ ] Built `dist/browser-client.js` does not contain `node:crypto` or `require()` (verified by `browser-client.spec.ts`)

## Blocked by

None — can start immediately
