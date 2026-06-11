# Code Context — Architectural Friction Report

## Files Retrieved

1. `packages/react-plugin/src/client.ts` (lines 1–697) — Next.js browser client, TypeScript
2. `packages/react-plugin/src/vite-plugin.ts` (lines 1–770) — Vite plugin; `generateClientScript()` (lines 55–770) inlines the entire browser client as a JS template string
3. `packages/react-plugin/src/data-oid.ts` (lines 1–66) — Node-side data-oid parsing (react-plugin copy)
4. `packages/extension/src/data-oid.ts` (lines 1–69) — Node-side data-oid parsing (extension copy)
5. `packages/react-plugin/src/next.tsx` (lines 1–17) — Next.js client injection wrapper
6. `packages/react-plugin/src/index.ts` (lines 1–4) — react-plugin package entry
7. `packages/extension/src/index.ts` (lines 1–157) — Pi extension entry
8. `packages/extension/src/server.ts` (lines 1–123) — WS server
9. `packages/extension/src/inspect.ts` (lines 1–135) — design_inspect tool
10. `packages/react-plugin/src/transform.ts` (lines 1–46) — Babel-based data-oid injection

---

## Duplication #1: Browser Client Logic (client.ts ≈ vite-plugin.ts `generateClientScript()`)

**Scale:** ~650 lines duplicated. The entire browser runtime exists in two structurally identical but textually divergent copies.

### Specific duplicated functions/features

| Feature | `client.ts` (TypeScript) | `vite-plugin.ts` (JS template string) |
|---|---|---|
| Widget creation (Shadow DOM, CSS, HTML) | `createWidget()` lines 196–384 | `createWidget(sendMessage)` inside template ~lines 99–425 |
| Selection management: add/remove/clear | `addSelection()`, `removeSelection()`, `clearAllSelections()` lines 217–249 | Inline inside `createWidget` + `window.__piDesignWidget` |
| Highlight apply/clear/reapply | `applyHighlight()`, `clearHighlight()`, `reapplyAllHighlights()` lines 178–215 | Same names, inline in template |
| Flash animation | `flashElement()` line 250 | `flashElement()` inside template |
| Alt+Click handling | `document.addEventListener("click", ...)` lines 459–478 | `document.addEventListener("click", handleAltClick, true)` ~lines 648+ |
| Alt+Hover tooltip | `showHoverTooltip()`/`hideHoverTooltip()` lines 423–457 | `showHoverTooltip()`/`hideHoverTooltip()` ~lines 710+ |
| WebSocket connection + reconnection | `connectWS()` lines 131–163 | `connect()` ~lines 587+ |
| History panel (get/save/show/clear) | `getHistory()`, `saveHistory()`, `showHistory()` lines 93–112 | Same functions inside template |
| Quick actions | `qaInstructions` map + click handler | Same map + handler |
| Structural context computation | `computeStructuralContext()` lines 47–69 | `computeStructuralContext()` inside `createWidget` |
| Error/success/processing states | `showError()`, `showSuccess()`, `setProcessing()` | Same inside template |
| `parseDataOid` (browser-safe) | Lines 22–32 | Lines ~72–79 inside template |
| `findByOid()` | Lines 16–19 | Lines ~63–65 inside template |
| `escapeHtml()` | Lines 71–73 | Inline `escapeHtml` defined inside `render()` |
| `getComputedStyles()` | Lines 75–81 | ~lines 663+ |
| `getBoundingBox()` | Lines 83–86 | ~lines 672+ |
| Selection persistence (sessionStorage) | `persistSelections()`/`restoreSelections()` | Same inside template |
| Escape + Alt+R key handling | `keydown` listener | Same inside template |
| Disconnect + beforeunload | `disconnect()`, `window.addEventListener("beforeunload", ...)` | Same in template |

### Behavioural differences (drift)

| Difference | `client.ts` | `vite-plugin.ts` |
|---|---|---|
| **`parseDataOid()` return shape** | Returns `{ filePath, line, column }` — **drops** `type` and `projectHash` fields | Returns `{ marker, projectHash, relativeMarker, filePath, line, column }` — **different key names**: `marker` vs `type`, `relativeMarker` (extra field) |
| **`parseDataOid()` regex logic** | Three-branch: Babel `c:H:r:file:line:column`, SWC `file:line:column`, SWC `file:line` — **pluralistic** | Single-branch: only matches `c:H:r:file:line:column` with exactly `parts.length !== 6` guard — **fails silently** on SWC format OIDs |
| **`getSelector()`** | **Does not exist** — uses `target.tagName.toLowerCase()` for `selector` field | Exists as separate function ~line 681: returns `element.id ? "#"+id : tagName` — richer selector |
| **Alt+Click guard** | Checks `!isAltDown` then checks `e.target.closest("[data-oid],[data-source]")` | `handleAltClick()` checks `event.altKey` directly | 
| **`HIGHLIGHT_STYLE_ID`** | **Not used** | Declared as `const HIGHLIGHT_STYLE_ID = "pi-design-highlight-style"` but **never actually used** — dead code |
| **Connection state in Alt+Hover** | Guards on `isAltDown && (window as any).__piDesignWidget` (checks widget exists) | Guards on `isAltDown && window.__piDesignWidget` (same logic, different syntax) |
| **`escapeHtml()` scoping** | Module-level function, shared | Defined **inline inside `render()`** — re-created on every render call as a closure |
| **Widget API shape** | `addSelection(sel)` takes full selection object | `addSelection(data)` same interface |
| **`window.__piDesignInit`** guard | Present — prevents double-init | **Missing** — no double-init guard (Vite virtual module system prevents double-import, but this is an implicit safety net difference) |
| **WS port source** | `(window as any).__PI_DESIGN_PORT || 9481` — configurable via window global | `${wsPort}` — plain injection from plugin options |
| **`ws.onerror`** | No-op: `ws.onerror = () => {}` | **Missing entirely** — no `onerror` handler |
| **`cancelBtn` visibility on `setProcessing(true)`** | Starts hidden, shows after 60s timeout | Same logic |
| **`restoreSelections()` guard** | Also checks `parsed.length === 0` and `selections.length > 0` — early return if already populated | Only checks `!Array.isArray(parsed)` — **missing** the `selections.length > 0` guard (could add duplicates on reconnect) |

### Source of truth assessment

- **`client.ts` is the more complete/correct copy**: it handles SWC-format OIDs, has the `__piDesignInit` guard, has `ws.onerror`, has the `restoreSelections` duplicate guard, uses proper TypeScript types.
- **`vite-plugin.ts` drifts**: it lacks SWC parsing, has different `parseDataOid` return keys, has dead code (`HIGHLIGHT_STYLE_ID`), is missing `ws.onerror`, and its `restoreSelections` has a bug (missing `selections.length > 0` guard).
- **However**, `vite-plugin.ts` has `getSelector()` which `client.ts` lacks — each copy has unique features the other doesn't.

### Why they diverged

- `client.ts` is a TypeScript module imported by Next.js at runtime. It has type safety, proper scoping, and can reference Node modules at build time.
- `vite-plugin.ts`'s `generateClientScript()` is a **JS string template** that gets served as a Vite virtual module. It cannot import anything, cannot use TypeScript, and all code must be inlined. This forces re-implementation in a different idiom (ES5 `var`/`function` vs TS `const`/arrow functions).

---

## Duplication #2: `data-oid.ts` (react-plugin vs extension)

**Scale:** 66 vs 69 lines — near-identical files.

### Specific differences

| Aspect | `react-plugin/src/data-oid.ts` | `extension/src/data-oid.ts` |
|---|---|---|
| **`formatDataOid()`** | Always outputs `type:projectHash:r:filePath:line:column` | **Conditional**: if `parts.projectHash` is truthy, uses Babel format; otherwise outputs `filePath:line:column` (SWC-compatible) |
| **JSDoc comment** | Same | Same |
| **`parseDataOid()`** | Identical | Identical |
| **`hashProjectRoot()`** | Identical | Identical |
| **`DataOidComponents` interface** | Identical | Identical |

### Drift risk

- `formatDataOid()` in the extension copy **produces different output** when `projectHash` is empty/falsy. In `react-plugin`, it would produce `:r:filePath:line:column` (broken). In `extension`, it degrades gracefully to SWC format.
- This is a real bug: `react-plugin`'s `formatDataOid` is never called with an empty `projectHash` (it always hashes the root), so the bug is latent but would surface if someone tried to format an SWC-style OID through it.
- **Source of truth:** `extension/src/data-oid.ts` is the more correct/defensive copy due to the conditional `formatDataOid`. But neither is documented as the canonical source.

---

## Duplication #3: Browser-safe `parseDataOid` (3 copies!)

There are **three** different implementations of `parseDataOid`:

| Location | Format | Returns |
|---|---|---|
| `client.ts` lines 22–32 | Babel + SWC + SWC-line | `{ filePath, line, column }` — **stripped** |
| `vite-plugin.ts` ~line 72 | Babel only | `{ marker, projectHash, relativeMarker, filePath, line, column }` — **different keys** |
| `data-oid.ts` (both copies) | Babel + SWC + SWC-line | `{ type, projectHash, filePath, line, column }` — **full** |

All three return different shapes with different key names. The `client.ts` version strips `type`/`projectHash` since the browser widget only needs `filePath` and `line` for display. The `vite-plugin.ts` version uses `marker`/`relativeMarker` instead of `type`. The canonical server-side version uses `type`/`projectHash`.

---

## Shallow Module / God File Assessment

### `client.ts` — God file (697 lines, 1 scope)

The entire client is a single IIFE with no module boundaries. All state is module-level closure variables. Functions are ~20+ top-level functions sharing mutable state (`selections`, `isProcessing`, `ws`, `isAltDown`, etc.).

### `vite-plugin.ts` — Two concerns merged (770 lines)

1. Vite plugin logic (resolveId, load, transform) — ~50 lines
2. Entire browser client script as a string template — ~720 lines

These have no relation but live in the same file. The plugin code is tiny; the template dwarfs it.

### `vite-plugin.ts` `generateClientScript()` — String-inlined code

All ~720 lines of browser code live as a JS template string (`return \`...\``). This means:
- No TypeScript checking
- No linting
- No IDE navigation
- No import resolution
- Syntax errors only caught at runtime in the browser
- Any refactor (e.g. rename) must be done twice manually

---

## Dependency / Data Flow

```
Next.js path:
  next.tsx → imports client.ts → direct TypeScript, shared module scope
  client.ts → parseDataOid (inline, browser-safe copy)
  client.ts → WS to localhost:9481

Vite path:
  vite-plugin.ts → transform.ts (injectDataOid on JSX) → formatDataOid from data-oid.ts
  vite-plugin.ts → generateClientScript() → inline JS → WS to localhost:wsPort
  generateClientScript() → parseDataOid (inline in template string, different shape)

Extension path:
  index.ts → server.ts (WS server)
  index.ts → data-oid.ts (parseDataOid)
  index.ts → inspect.ts → data-oid.ts (parseDataOid, DataOidComponents)

Shared server:
  server.ts listens on 9481 (up to 9491), accepts ClientMessages, broadcasts ServerMessages
  Both Next.js and Vite clients connect to the same WS protocol
```

---

## Maintenance Surface Area Summary

| Duplication | Lines | Drift Bugs | Risk |
|---|---|---|---|
| `client.ts` ↔ `vite-plugin.ts` client script | ~650 | 5+ (parseDataOid shape, SWC support missing, restoreSelections guard, ws.onerror, HIGHLIGHT_STYLE_ID dead code) | **Critical** — any bug fix or feature must be applied twice in different idioms |
| `data-oid.ts` across packages | ~66 lines | 1 (formatDataOid conditional missing in react-plugin) | **Medium** — easy to miss when adding new OID format |
| `parseDataOid` browser-safe (3 copies) | ~10 lines × 3 | 2 (different return shapes, missing SWC branch in vite) | **High** — three different return types for the "same" function |

### Total duplicated code

- **~650 lines** of browser client (client.ts ↔ vite-plugin.ts template)
- **~66 lines** of data-oid.ts × 2 copies
- **~30 lines** of parseDataOid across 3 locations
- **Estimated total: ~750+ lines** of duplicated logic

### What makes fixing hard

1. **TypeScript vs JS template string**: Can't simply extract shared code — the Vite path must produce a plain JS string (no imports, no types, no module system). The Next.js path can use TypeScript imports natively.
2. **Different function signatures**: `parseDataOid` returns 3 different shapes. Consumers depend on specific shapes.
3. **No shared package**: There's no `@pi-design/shared` or `@pi-design/browser-client` package. The two packages (`react-plugin` and `extension`) are in the same repo but have no internal dependency graph for shared code.

---

## Start Here

Open `packages/react-plugin/src/vite-plugin.ts` line 55 (`generateClientScript`). This is the heart of the duplication problem. Any remediation must address the fact that this function is a 720-line string literal that re-implements `client.ts` in a different language idiom. The first architectural decision is: how to share browser client code between the TypeScript module path (Next.js) and the string-template path (Vite).

### Candidate extraction strategies

1. **Build-time extraction**: Write client code once in TypeScript, build it to JS, then read the built output as a string in `generateClientScript()`. Requires a build step but preserves a single source of truth.
2. **Shared browser package**: Create `@pi-design/browser-client` that exports the widget/selection/WS code. The Next.js path imports it normally. The Vite path uses Vite's own module resolution to serve it as a virtual module.
3. **Canonical `parseDataOid` with adapter**: Define one canonical return type (full `DataOidComponents`). Browser consumers that only need `filePath:line` can destructure. Eliminates the three-way return type split.
