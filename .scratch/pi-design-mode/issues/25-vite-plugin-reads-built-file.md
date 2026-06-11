Status: ready-for-agent

## Parent

PRD: `.scratch/pi-design-mode/prd-browser-client-consolidation.md`

## What to build

Replace the 720-line `generateClientScript()` template string in `vite-plugin.ts` with a `readFileSync` of the built `dist/browser-client.js`. The Vite plugin's `load()` hook reads the file and returns it as the virtual module content.

Remove the `wsPort` option from `PiDesignViteOptions` — the built file reads `window.__PI_DESIGN_PORT || 9481` at runtime. Delete the entire `generateClientScript()` function.

Update the Vite plugin tests:
- `load()` returns the contents of `dist/browser-client.js` (which must be built first)
- `load()` result contains key markers: `createWidget`, `findByOid`, `parseDataOid`
- Remove the test for custom `wsPort` injection (no longer applicable)
- Verify `load()` result doesn't reference `node:crypto` or `require()`
- Keep the transform, resolveId, and entry-injection tests unchanged

The `wsPort` removal is a minor breaking change: users who passed `wsPort: 5555` must now set `window.__PI_DESIGN_PORT = 5555` in their app HTML.

Verify end-to-end: run the Vite test app (`test-app/`), confirm widget appears, Alt+Click selects elements, submit works, `data-oid` attributes in DOM.

## Acceptance criteria

- [ ] `generateClientScript()` function deleted from `vite-plugin.ts`
- [ ] `vite-plugin.ts` is under 100 lines (currently 770)
- [ ] `PiDesignViteOptions` no longer has `wsPort` field
- [ ] `load()` hook reads `dist/browser-client.js` via `readFileSync`
- [ ] Vite plugin tests updated and passing
- [ ] Vite test app: widget appears, Alt+Click works, submit sends to Pi

## Blocked by

- #24 Browser client module (needs `dist/browser-client.js` to exist)
