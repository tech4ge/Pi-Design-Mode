Status: ready-for-agent

## Parent

PRD: `.scratch/pi-design-mode/prd-browser-client-consolidation.md`

## What to build

Create `packages/react-plugin/src/browser-client.ts` — the single source of truth for the browser client. This file replaces both `client.ts` (Next.js path) and the `generateClientScript()` template string in `vite-plugin.ts` (Vite path).

The file is a self-initialising IIFE (top-level `if` guard, no exports). On load it:
- Guards with `window.__piDesignInit` (prevents double-init)
- Reads `window.__PI_DESIGN_PORT || 9481` for WS port
- Creates WS connection with auto-reconnect, `ws.onerror`, `design:connect` on open
- Creates widget DOM in Shadow DOM with the Catppuccin dark theme CSS (matching current Vite/widget exactly)
- Widget receives `sendMessage` parameter: `{ send(msg), isConnected() }`
- Implements all selection features: Alt+Click toggle, Alt+Hover tooltip, Alt+R recall, Esc to clear, color-coded outlines, flash, quick actions, history panel, structural context
- Uses `findByOid(value)` that checks both `[data-oid]` and `[data-source]` attributes
- Uses `parseDataOid(oid)` with all 3 format branches (Babel `c:H:r:file:line:column`, SWC `file:line:column`, SWC `file:line`) returning canonical `{ type, projectHash, filePath, line, column }`
- Uses `getSelector(element)` returning `#id` or `tagName.toLowerCase()`
- Persists/restores selections via sessionStorage
- Sets `window.__piDesignWidget` API object after DOM creation (not before)
- Handles `design:done` with flash confirmation, `design:error` with error banner, `design:processing` with cancel after 60s

Build this file with tsup to `dist/browser-client.js` as an IIFE entry point. Add `browser-client` to tsup entry config and `package.json` exports.

The Vite plugin and Next.js import are NOT changed in this issue — they continue using their current paths. This issue only creates the new file and build output.

## Acceptance criteria

- [ ] `browser-client.ts` exists with all features listed above
- [ ] `dist/browser-client.js` is built by tsup as a valid JS file
- [ ] Built file does not reference `node:crypto`, `require()`, or `import`
- [ ] Built file contains `__PI_DESIGN_PORT`, `findByOid`, `parseDataOid`, `createWidget`, `data-source`
- [ ] `parseDataOid` handles all 3 OID formats (Babel, SWC full, SWC line)
- [ ] `findByOid` queries both `[data-oid]` and `[data-source]` attributes
- [ ] `package.json` has `./browser-client` export pointing to `dist/browser-client.js`
- [ ] Existing tests still pass (no files modified except tsup config, package.json, and new browser-client.ts)

## Blocked by

None - can start immediately
