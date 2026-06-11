# PRD: Browser Client Consolidation

## Problem Statement

The browser client runtime exists in two structurally identical but textually divergent copies: `client.ts` (TypeScript module, 697 lines, used by Next.js) and `generateClientScript()` (JS template string, 720 lines, used by Vite). Every bug fix or feature must be applied twice in different idioms. Already 5+ drift bugs exist. The Vite copy lacks SWC format support, returns different `parseDataOid` keys, and is untyped, unlinted, and un-navigable in IDEs.

Users installing the plugin get inconsistent behaviour between Vite and Next.js environments, and maintainers face a doubling of effort for any change.

## Solution

Write the browser client once as TypeScript. Build it to a JS IIFE with tsup. Vite reads the built file as a string for its virtual module. Next.js imports it as a side-effect module. Both environments get the same TypeScript-checked, linted, IDE-navigable code.

## User Stories

1. As a plugin maintainer, I want to write widget/selection/WS code once, so that bug fixes apply to both Vite and Next.js users
2. As a plugin maintainer, I want the browser client to be TypeScript, so that changes are type-checked before reaching users
3. As a plugin maintainer, I want `parseDataOid` to have one return type, so that I don't have to remember which keys each copy uses
4. As a plugin maintainer, I want to delete the 720-line `generateClientScript` template string, so that I never have to debug untyped JS in a template literal again
5. As a Vite user, I want the design mode widget to support `data-source` attributes, so that SWC-format OIDs work if I switch bundlers
6. As a Next.js user, I want the design mode widget to be identical to the Vite version, so that UI behaviour is consistent across environments
7. As a plugin user, I want the browser client to read `window.__PI_DESIGN_PORT || 9481`, so that I can override the WS port without bundler config
8. As a plugin maintainer, I want `data-oid.ts` to exist in one place, so that `parseDataOid`/`formatDataOid`/`hashProjectRoot` don't drift between packages
9. As a plugin maintainer, I want `getSelector()` in the unified client, so that the selector field returns `#myId` when available instead of just the tag name
10. As a plugin maintainer, I want the Vite plugin to be ~80 lines, so that the browser client doesn't dominate the file

## Implementation Decisions

- **Single source of truth**: `packages/react-plugin/src/browser-client.ts` replaces both `client.ts` and the `generateClientScript()` template string. This file is the canonical browser client.
- **Build output**: tsup compiles `browser-client.ts` to `dist/browser-client.js` as an IIFE (self-executing). No exports. Runs on load.
- **Vite consumption**: `vite-plugin.ts`'s `load()` hook reads `dist/browser-client.js` with `readFileSync()` and returns it as the virtual module content. Template interpolation eliminated. `generateClientScript()` deleted.
- **Next.js consumption**: `next.tsx` does `import "@pi-design/react-plugin/browser-client"`. The IIFE runs as a side-effect. No `init()` call needed.
- **WS port**: Hardcodes `window.__PI_DESIGN_PORT || 9481`. The Vite plugin's `wsPort` option is removed. Users who need a custom port set `window.__PI_DESIGN_PORT` before the script loads.
- **Widget creation interface**: `createWidget(sendMessage)` — receives `{ send, isConnected }`. Both Vite and Next.js create the WS connection then pass it in. The client doesn't own the WS lifecycle.
- **`parseDataOid` return type**: Canonical `DataOidComponents` from `data-oid.ts`. Browser code destructure-projects what it needs. Inlined in browser-client.ts (no import of node-only modules).
- **`findByOid`**: Checks both `data-oid` and `data-source` attributes. Single implementation serves both Vite/Babel and Next.js/SWC environments.
- **`getSelector()`**: Absorbed from Vite copy. Returns `#myId` when element has an ID, else `tagName.toLowerCase()`.
- **`data-oid.ts` consolidation**: The `packages/extension/src/data-oid.ts` copy remains (extension can't import from react-plugin at runtime). But the browser-client inlines its own `parseDataOid` without importing `crypto`.
- **`client.ts` deleted**: Replaced entirely by `browser-client.ts`.
- **`next.tsx` simplified**: Just `"use client"` + `import "@pi-design/react-plugin/browser-client"`. The `PiDesignClient` wrapper component removed — the import is the entire injection.

## Testing Decisions

- **Good test**: tests the external interface of a module (input → output, or hook call → observable effect). Run through the Vite plugin interface, not internals of the template string.
- **Vite plugin `load()` hook**: Test that it returns a non-empty string containing key markers (`createWidget`, `findByOid`, `parseDataOid`, `altKey`). Previously tested the template string content — now tests the built file content.
- **`parseDataOid` in browser context**: Test the inlined version handles all 3 formats (Babel `c:H:r:file:line:column`, SWC `file:line:column`, SWC `file:line`). This is a subset of the existing `data-oid.ts` tests.
- **Vite plugin `wsPort` option removed**: The existing test for custom WS port in the client script changes — verify the built file contains `__PI_DESIGN_PORT || 9481` instead of a hardcoded `${wsPort}`.
- **Build artifact exists**: Test that `dist/browser-client.js` is a valid JS file (can be parsed, doesn't reference `node:crypto`).
- Prior art: `vite-plugin.spec.ts` tests the plugin hooks, `transform.spec.ts` tests the pure transform function.

## Out of Scope

- Changes to `packages/extension/` server or inspect logic (they already work correctly with both OID formats)
- Next.js SWC adapter improvements (issue #23 is a separate concern)
- Unit testing browser DOM interactions (the widget/Alt+Click/tooltip — these are only testable in a real browser or with a DOM shim; existing coverage is functional via manual testing)
- Extracting `data-oid.ts` to a shared package (the extension copy needs `crypto`, the browser copy can't use it — the split is justified by the environment boundary)

## Further Notes

- The Vite plugin's `wsPort` option removal is a minor breaking change. Any user passing `wsPort: 5555` to `piDesignVitePlugin()` will need to set `window.__PI_DESIGN_PORT = 5555` in their app instead. This is documented in the plugin README.
- The `PiDesignClient` React component in `next.tsx` is removed. Users change from `<PiDesignClient />` in layout to a bare `import "@pi-design/react-plugin/browser-client"`. This is simpler and avoids the client-component wrapper.
- The `__piDesignInit` double-init guard moves into `browser-client.ts`. Currently the Vite path lacks it — the unified client includes it.
