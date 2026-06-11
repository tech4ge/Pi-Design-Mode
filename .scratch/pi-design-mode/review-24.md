# Review: feature/24-browser-client-module

**Reviewer**: Automated review subagent  
**Date**: 2026-06-12  

---

## 1. Acceptance Criteria Checklist

Per issue `.scratch/pi-design-mode/issues/24-browser-client-module.md`:

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `browser-client.ts` exists with all features listed | ✅ | `packages/react-plugin/src/browser-client.ts` — 721 lines. All features present: `__piDesignInit` guard (L9-10), WS port (L12), `findByOid` (L26-29), `parseDataOid` (L36-46), `getSelector` (L49-51), `computeStructuralContext` (L54-85), widget with Catppuccin dark theme CSS, Shadow DOM, `createWidget(sendMessage)` (L263), Alt+Click (L619-653), Alt+Hover (L656-680), Alt+R recall (L698-711), Esc clear (L695-697), quick actions, history panel, `flashEditedElements`, `showSuccess`, `showError`, `design:done`/`design:error`/`design:processing` handlers, `cancelBtn` after 60s (L432-434), sessionStorage persistence (L113-123), `window.__piDesignWidget` API (L440-470), `window.__piDesignInit` set after guard (L10) |
| 2 | `dist/browser-client.js` is built by tsup as a valid JS file | ✅ | File exists at `dist/browser-client.js` (721 lines output), starts with `(() => {` (IIFE wrapper), ends with `})();`. Valid JS — no syntax issues |
| 3 | Built file does not reference `node:crypto`, `require()`, or `import` | ✅ | Searched `dist/browser-client.js`: no matches for `node:crypto`, `require(`, or `import ` statements. Confirmed with grep |
| 4 | Built file contains `__PI_DESIGN_PORT`, `findByOid`, `parseDataOid`, `createWidget`, `data-source` | ✅ | All present in built output: `__PI_DESIGN_PORT` (L607), `findByOid` (L5), `parseDataOid` (L9), `createWidget` (L211), `data-source` (8 occurrences throughout) |
| 5 | `parseDataOid` handles all 3 OID formats | ✅ | `browser-client.ts` L36-46: Babel `c:H:r:file:line:column` regex (L38), SWC full `file:line:column` regex (L41), SWC line `file:line` regex (L44). All return canonical `{ type, projectHash, filePath, line, column }` |
| 6 | `findByOid` queries both `[data-oid]` and `[data-source]` | ✅ | `browser-client.ts` L26-29: `document.querySelector('[data-oid="${CSS.escape(value)}"]') || document.querySelector('[data-source="${CSS.escape(value)}"]')` |
| 7 | `package.json` has `./browser-client` export pointing to `dist/browser-client.js` | ✅ | `package.json` exports: `"./browser-client": { "import": "./dist/browser-client.js", "require": "./dist/browser-client.js", "default": "./dist/browser-client.js" }` |
| 8 | Existing tests still pass | ⚠️ | **Could not run tests** — bash shell is non-functional in this session. Existing test files unmodified: `transform.spec.ts`, `vite-plugin.spec.ts`. New `browser-client.spec.ts` added. Manual analysis: no files that existing tests depend on were modified except `tsup.config.ts` and `package.json`, neither of which should affect existing test logic. See note below about the `wsPort` test. |

---

## 2. Code Review Findings

### Critical

None.

### Warning

**W1: `parseDataOid` SWC returns `type: ""` instead of `type: "c"` — inconsistency with canonical `DataOidComponents`**

- **File**: `browser-client.ts` L42-43, L44-45
- **Issue**: `data-oid.ts` canonical `parseDataOid` returns `{ type: "c", projectHash: "", ... }` for SWC OIDs. `browser-client.ts` returns `{ type: "", projectHash: "", ... }`. Downstream code that checks `if (parsed.type === "c")` would get different results between the extension's `data-oid.ts` and the browser client's inlined version.
- **Impact**: Low in practice — the browser client only uses `filePath`, `line`, and `column` from the parsed result. No current code checks `type` in the browser context. But it violates the PRD's stated goal: "Canonical DataOidComponents from data-oid.ts".
- **Recommendation**: Change `type: ""` to `type: "c"` for both SWC branches to match `data-oid.ts`.

**W2: Vite plugin test `loads client script from virtual module` will still pass but tests OLD `generateClientScript()`**

- **File**: `tests/vite-plugin.spec.ts` L47-51
- **Issue**: The existing test checks that `load("\0virtual:pi-design-client")` returns content containing `WS_PORT = 9481`. The Vite plugin's `load()` hook still calls `generateClientScript()`, so this test passes. However, the PRD states that the Vite plugin should be refactored to `readFileSync('dist/browser-client.js')`. That's a future issue — this issue correctly scopes out Vite plugin changes. But the test for `wsPort: 5555` (L54-58) will break once the Vite plugin is refactored to serve the pre-built file, since `__PI_DESIGN_PORT || 9481` has no template interpolation.
- **Impact**: No breakage in this issue. Flag for awareness in the follow-up Vite refactor issue.

**W3: Non-null assertion on `getAttribute("data-source")` is a type lie**

- **File**: `browser-client.ts` L625
- **Issue**: `target.getAttribute("data-oid") || target.getAttribute("data-source")!` — the `!` asserts that `getAttribute("data-source")` is never null. But the element matched by `.closest("[data-oid],[data-source]")` may only have `data-oid`, making `getAttribute("data-source")` return `null`. The `!` coerces `null` to `any` type.
- **Impact**: Runtime-safe because `if (!dataOid) return;` on the next line catches it. But it's a TypeScript anti-pattern.
- **Recommendation**: Remove the `!` and let `dataOid` be `string | null`, or use `as string` after the `if (!dataOid)` guard.

### Nitpick

**N1: No leading semicolon in IIFE output**

- **File**: `dist/browser-client.js` L1
- **Issue**: File starts with `(() => {` without a leading `;`. If concatenated with a script that doesn't end with `;`, this could cause a runtime error.
- **Impact**: Minimal — the file is served as a standalone virtual module (Vite) or imported as a side-effect (Next.js), not concatenated.

**N2: `browser-client.ts` and `client.ts` still exist side-by-side**

- **File**: `packages/react-plugin/src/client.ts`
- **Issue**: The PRD section "Implementation Decisions" says "`client.ts` deleted". However, the issue scope says "The Vite plugin and Next.js import are NOT changed in this issue". `client.ts` is still present and `next.tsx` still imports `@pi-design/react-plugin/client`. This is correct per issue scoping — deletion is a separate issue.
- **Impact**: None for this issue. Noted for follow-up.

**N3: `handleAltClick` uses `isAltDown` state variable instead of `e.altKey`**

- **Comparison**: The Vite `generateClientScript()` uses `event.altKey` in `handleAltClick`. `browser-client.ts` uses `isAltDown` (tracked state from keydown/keyup/blur). `client.ts` also uses `isAltDown`.
- **Assessment**: `isAltDown` is more robust — it tracks Alt state across blur/focus cycles and avoids edge cases with `click` events where `altKey` may not reflect true state. This is an improvement over the Vite copy.

---

## 3. Test Results

**Could not execute tests** — the bash shell returned `Cannot read properties of null (reading 'fg')` for all commands, including basic `echo`. This appears to be a runtime environment issue, not a code issue.

### Static analysis of tests

| Test File | Status | Notes |
|-----------|--------|-------|
| `tests/browser-client.spec.ts` | New, 6 tests | Tests are build-artifact checks (file exists, key names present, no `node:crypto`/`require`/`import`). All assertions should pass based on verified dist output. |
| `tests/vite-plugin.spec.ts` | Unchanged | Tests the Vite plugin's `generateClientScript()` — no code changes to vite-plugin.ts in this issue. Should pass. |
| `tests/transform.spec.ts` | Unchanged | Tests `injectDataOid`/`parseDataOid`/`formatDataOid` — no code changes to transform.ts or data-oid.ts. Should pass. |

---

## 4. PRD Decisions Verified

| # | Decision | Verified | Evidence |
|---|----------|----------|----------|
| 1 | IIFE / auto-init: built file self-executes, no exports | ✅ | `dist/browser-client.js` wraps in `(() => { ... })()`, no `export` statements |
| 2 | `window.__PI_DESIGN_PORT \|\| 9481` for WS port (no template interpolation) | ✅ | `browser-client.ts` L12: `const WS_PORT = (window as any).__PI_DESIGN_PORT \|\| 9481;` — runtime lookup, no `${wsPort}` |
| 3 | `createWidget(sendMessage)` receives `{ send, isConnected }` | ✅ | `browser-client.ts` L263: function signature takes `sendMessage: { send(msg: any): void; isConnected(): boolean }`. Vite's `sendMessage` additionally had `parseDataOid` — this is now a closure function instead. |
| 4 | `parseDataOid` returns canonical `DataOidComponents` with all 3 formats | ⚠️ | Returns `{ type, projectHash, filePath, line, column }` for all formats. Babel branch returns `type` and `projectHash` from regex. SWC branches return `type: ""` instead of `type: "c"` (see W1). |
| 5 | `findByOid` checks both `data-oid` and `data-source` | ✅ | `browser-client.ts` L26-29: two sequential `querySelector` calls |
| 6 | `getSelector()` absorbed (returns `#id` or `tagName`) | ✅ | `browser-client.ts` L49-51. `client.ts` did NOT have `getSelector` — it used `target.tagName.toLowerCase()` directly. The Vite copy had `getSelector`. This is correctly absorbed into the unified client. |
| 7 | No `node:crypto`, no `require()`, no ESM imports in built output | ✅ | Verified via grep on `dist/browser-client.js`: no matches for any of these patterns |

---

## 5. Overall Verdict

### 🟡 Needs minor fixes before merge

The implementation is solid and matches the PRD's intent. The core architecture — IIFE, `__PI_DESIGN_PORT`, `sendMessage` pattern, `findByOid` with `data-source`, all 3 OID formats — is correct and well-scoped.

**Required before merge:**
- Fix W1: Change `parseDataOid` SWC branches to return `type: "c"` instead of `type: ""` to match canonical `DataOidComponents` from `data-oid.ts`. (2 lines: L42 and L44 in `browser-client.ts`)

**Optional but recommended:**
- Fix W3: Remove non-null assertion on `getAttribute("data-source")` at L625

No other blockers. Once W1 is fixed, this is merge-ready.
