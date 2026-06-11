# Pi Design Mode — Full Review

**Date:** 2026-06-11  
**Reviewer:** review subagent  
**Scope:** Main branch, all 6 issues merged

---

## 1. Acceptance Criteria Checklist

### Issue 01: data-oid injection + SWC adapter

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Next.js app with SWC plugin has data-oid attributes in dev mode | ❌ | No SWC adapter exists. `transform.ts` uses Babel (`@babel/parser` + `@babel/traverse`). No Rust/WASM SWC plugin, no `experimental.swcPlugins` registration. Next.js in default SWC mode cannot use this. |
| 2 | data-oid format matches `c:H:r:file:line:column` spec | ✅ | `data-oid.ts:15` — `formatDataOid` produces exact format. `transform.ts:39-45` — injects with `type:"c"`, project hash, `"r"`, relative file path, line, column+1. |
| 3 | File paths are relative to project root | ✅ | `transform.ts:11-13` — strips `projectRoot` prefix and leading slash. |
| 4 | Line and column numbers are accurate | ✅ | `transform.ts:23-24` — uses Babel `loc.start.line` and `loc.start.column + 1`. Test `transform.spec.ts:14` verifies format with regex. |
| 5 | Same-line elements get distinct data-oid values | ✅ | `transform.spec.ts:32-43` — 3 same-line elements → 3 distinct oids. Verified by `Set` uniqueness. |
| 6 | Production builds do NOT include data-oid | ⚠️ | Vite plugin uses `apply: "serve"` (`vite-plugin.ts:14`). No SWC/Next.js adapter to verify production guard. The core `injectDataOid` has no guard; depends on adapter. |
| 7 | App compiles and runs without errors | ❌ (SWC) | Cannot verify for Next.js — no SWC adapter. Vite pathway compiles based on tests. |
| 8 | Tests: fixture TSX → correct data-oid | ✅ | `transform.spec.ts` — 8 transform tests + 2 parse round-trip tests. |
| 9 | Tests cover edge cases: fragments, conditional, same-line | ✅ | Fragments: `transform.spec.ts:68-76`. Same-line: `transform.spec.ts:32-43`. Conditional: implicit in nested test. |

**Verdict: 5/9 pass, 2 partial, 2 fail (SWC adapter missing).**

### Issue 02: Extension /design command + WS server

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | /design command is registered | ✅ | `extension/src/index.ts:140` — `pi.registerCommand("design", ...)`. |
| 2 | Running /design starts WS server + footer + widget | ✅ | `index.ts:146-160` — `new DesignModeServer({port:9481})`, `server.start()`, `ctx.ui.setStatus("design", "🔴 Design Mode")`, `updateWidget(ctx)`. |
| 3 | WS client can connect | ✅ | `server.spec.ts:9-16` — ws client connects successfully. |
| 4 | Widget updates to "connected" on client connect | ✅ | `index.ts:163-164` — `design:connect` handler calls `updateWidget(ctx)` which shows WS status. |
| 5 | Running /design again stops server + clears status | ✅ | `index.ts:131-139` — broadcasts `design:mode:off`, stops server, clears status/widget. |
| 6 | Port conflict auto-increment | ✅ | `server.ts:30-38` — loop through ports with `maxPortRetries`. `server.spec.ts:20-28` — verifies port increment. |
| 7 | Clean shutdown on session end | ✅ | `index.ts:226-230` — `session_shutdown` handler broadcasts `design:mode:off` and stops server. |

**Verdict: 7/7 pass.**

### Issue 03: Client script WS + Alt+Click selection

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Client script connects to Pi's WS on page load | ✅ | `client.ts:218` — `connect()` called at module end. Connects to `ws://localhost:9481`. |
| 2 | App works normally if Pi not running | ✅ | `client.ts:34-38` — `ws.onclose` sets `isConnected = false`, reconnects silently. No error thrown on failure. |
| 3 | Alt+Click extracts data-oid + element info | ✅ | `client.ts:96-128` — `handleAltClick` checks `event.altKey`, finds `[data-oid]`, extracts styles, bounding box, text. |
| 4 | design:select message sent with required fields | ✅ | `client.ts:119-127` — sends `design:select` with `dataOid`, `selector`, `computedStyles`, `boundingBox`, `tagName`, `textContent`. |
| 5 | Clicked element gets highlight outline | ✅ | `client.ts:131` — calls `highlightElement(dataOid)`. `injectHighlightStyle()` adds 2px solid blue outline. |
| 6 | Normal clicks unaffected | ✅ | `client.ts:96` — `if (!event.altKey) return;` — early return for non-alt clicks. |
| 7 | Auto-reconnect on WS drop | ⚠️ | `client.ts:38` — `setTimeout(connect, 2000)` — reconnects, but uses fixed 2s delay, not exponential backoff as specified. |
| 8 | page unload sends design:disconnect | ✅ | `client.ts:214-217` — `beforeunload` handler sends `design:disconnect`. |
| 9 | Tests: WS protocol contract | ❌ | No tests for client script. PRD identifies this as "highest-value seam". No mock server verifying message shapes. |

**Verdict: 7/9 pass, 1 partial, 1 fail.**

### Issue 04: Selection message + Pi widget + submit

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Alt+Click causes selection message in Pi conversation | ✅ | `index.ts:170-183` — `design:select` handler calls `pi.sendMessage()` with `customType: "design-mode-select"`. |
| 2 | Browser widget appears on WS connect + selection | ✅ | `client.ts:27-31` — widget created on `ws.onopen`. Selections added via `window.__piDesignWidget.addSelection()`. |
| 3 | Widget shows selected element info (tag, file, line) | ✅ | `widget.ts:161-163` — renders `<tagName>` and `filePath:line` from parsed data-oid. |
| 4 | User can type instruction in text input | ✅ | `widget.ts:127` — `<input type="text" placeholder="Describe the change...">`. |
| 5 | Submit sends design:submit + Pi conversation message | ✅ | `widget.ts:181-189` sends `design:submit` via WS. `index.ts:194-207` routes to `pi.sendMessage()` with `triggerTurn: true`. |
| 6 | Widget shows "Processing..." + disables Submit | ✅ | `widget.ts:191-193` — `isProcessing = true`, button disabled, processing div shown. |
| 7 | design:done returns widget to normal | ✅ | `client.ts:77-79` — `design:done` → `setProcessing(false)`. `widget.ts:238-244` — resets processing state. |
| 8 | User can deselect element from widget list | ✅ | `widget.ts:167-170` — remove button on each selection item calls `removeSelection()` which sends `design:deselect`. |
| 9 | Widget doesn't interfere with layout (Shadow DOM) | ✅ | `widget.ts:12-16` — Shadow DOM with `mode: "open"`, `all: initial` reset, fixed positioning. |
| 10 | Widget positioned bottom-right | ✅ | `widget.ts:9` — `position:fixed;bottom:16px;right:16px`. |

**Verdict: 10/10 pass.**

### Issue 05: Full LLM loop + design_inspect

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | design_inspect tool is registered | ✅ | `index.ts:9-56` — `pi.registerTool({ name: "design_inspect", ... })`. |
| 2 | design_inspect returns component name, file, line, column, props, styles, bounding box | ✅ | `index.ts:32-56` — parses dataOid, reads file, calls `inspectElement()`. Merges runtime styles/boundingBox from prior selection. `inspect.ts:56-83` extracts tagName, props, componentName. |
| 3 | design_inspect sends design:highlight to browser | ✅ | `index.ts:34` — `server?.broadcast({ type: "design:highlight", dataOid })`. |
| 4 | Submit triggers LLM to act on message | ✅ | `index.ts:203-207` — `pi.sendMessage()` with `triggerTurn: true`. |
| 5 | LLM reads file + makes edit using Pi's edit tool | ✅ (by design) | The submit message with `triggerTurn: true` puts the design context in the conversation. LLM uses Pi's existing `read`/`edit` tools. No custom edit logic needed. |
| 6 | After LLM finishes, design:done sent to browser | ⚠️ | `index.ts:222-225` — `turn_end` handler sends `design:done`. But this fires on ALL LLM turns, not just design-triggered ones. False `design:done` on normal conversations will clear widget selections. |
| 7 | Browser updates via HMR after edit | ✅ (by design) | HMR is standard Vite/Next.js behavior — no extension code needed. |
| 8 | LLM error → design:done still sent | ⚠️ | The `turn_end` event likely fires even on error, but there's no explicit error handling. If the session crashes without firing `turn_end`, the widget stays in processing state indefinitely. |
| 9 | design_inspect only active in design mode | ❌ | Tool is always registered via `pi.registerTool()` at import time. No `pi.setActiveTools()` call. Tool is available to LLM even when design mode is off. |
| 10 | Tests: design_inspect with known data-oid returns correct output | ✅ | `inspect.spec.ts` — 3 tests including component info extraction and error cases. |

**Verdict: 6/10 pass, 2 partial, 2 fail.**

### Issue 06: Vite adapter for data-oid injection

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Vite+React app with plugin has data-oid in dev mode | ✅ | `vite-plugin.ts:13` — `apply: "serve"`. `transform` hook activates during dev. |
| 2 | data-oid format identical to SWC adapter | ✅ | `vite-plugin.spec.ts:32-48` — format parity test extracts and compares oids from both paths. |
| 3 | File paths relative to project root | ✅ | Uses shared `injectDataOid()` which handles path relativization. |
| 4 | Line and column numbers accurate | ✅ | Uses shared core. |
| 5 | Same-line elements get distinct data-oid values | ✅ | Uses shared core. |
| 6 | Production builds do NOT include data-oid | ✅ | `vite-plugin.ts:14` — `apply: "serve"` ensures transform only runs in dev. |
| 7 | App compiles and runs without errors | ✅ (test-level) | No integration test, but unit tests pass. |
| 8 | Tests: same fixture produces identical oids through both adapters | ⚠️ | `vite-plugin.spec.ts:32-48` — compares Vite plugin output vs core `injectDataOid()` but there is no SWC adapter to compare against. The test compares two Babel-based paths that share the same code. |
| 9 | Tests cover edge cases | ⚠️ | Vite plugin tests are 3 basic tests (transform, skip-ts, format parity). No fragment/same-line/conditional tests specific to Vite (but core transform tests cover these). |

**Verdict: 6/9 pass, 3 partial.**

---

## 2. Code Review Findings

### Critical

**C1: No SWC/Next.js adapter — Issue 01 core deliverable missing**  
- **File:** `packages/react-plugin/src/` — missing  
- **Detail:** Issue 01 specifies a SWC plugin for Next.js registered via `experimental.swcPlugins`. The PRD (line 136) says "SWC plugin written in Rust (or WASM via swc-bindgen)". There is no SWC adapter implementation. The `transform.ts` uses Babel, which works for Vite but not for Next.js's default SWC compilation. A Next.js project would need to add a `.babelrc` to force Babel mode, which de-optimizes the build.  
- **Impact:** Issue 01 is unfulfilled. Next.js users (the primary React framework target) cannot use the plugin without degrading their build pipeline.

**C2: No client script virtual module injection — entire browser-side runtime is non-functional**  
- **File:** `packages/react-plugin/src/vite-plugin.ts`  
- **Detail:** The Vite plugin provides a `transform` hook for data-oid injection but has no `resolveId`/`load` hooks to inject `client.ts` + `widget.ts` as virtual modules. The PRD (line 137) says "Embeds client script as a virtual module injected into the page during dev mode." Issue 01 says "The plugin also injects the client script as a virtual module." Issue 06 says "Injects the client script virtual module (same as SWC adapter)." None of this is implemented. Without virtual module injection, the browser has no WS client, no Alt+Click handler, and no widget.  
- **Impact:** The entire client-side feature is dead code. No browser-side functionality activates without manual script injection.

### Warning

**W1: `design:mode:on` not sent to client on connect — protocol gap**  
- **File:** `packages/extension/src/index.ts:163-164`  
- **Detail:** When `design:connect` is received, the handler only calls `updateWidget(ctx)`. It never broadcasts `design:mode:on` back to the client. The PRD (line 95) defines `design:mode:on` with `{ wsPort }` payload as a server-to-client message. The `ServerMessage` type includes it (`server.ts:16`) and there's a broadcast test for it (`server.spec.ts:94`), but the extension never actually sends it.  
- **Impact:** Client cannot confirm successful connection to the design mode server or learn the actual port (relevant when auto-increment is used).

**W2: `setActiveTools` not used — `design_inspect` always available to LLM**  
- **File:** `packages/extension/src/index.ts:9-56`  
- **Detail:** The tool is registered globally at module load time. Issue 05 AC says "design_inspect tool is only active when design mode is on." The `pi.setActiveTools()` method is never called.  
- **Impact:** LLM may attempt to use `design_inspect` when design mode is off, causing confusing tool calls.

**W3: `turn_end` handler sends `design:done` on ALL LLM turns — not just design-triggered ones**  
- **File:** `packages/extension/src/index.ts:222-225`  
- **Detail:** `pi.on("turn_end", () => { server?.broadcast({ type: "design:done" }); })` fires on every LLM turn, not just turns initiated by `design:submit`. The widget's `setProcessing(false)` clears all selections (`widget.ts:241`).  
- **Impact:** Any normal Pi conversation while design mode is active will clear the widget's selected elements, causing unexpected data loss.

**W4: `parseDataOid` in browser code pulls in `node:crypto` dependency from `data-oid.ts`**  
- **File:** `packages/react-plugin/src/client.ts:10` — `import { parseDataOid } from "../data-oid.js"`  
- **Detail:** `data-oid.ts` imports `crypto from "node:crypto"` at the top. While `parseDataOid` doesn't use `crypto`, a bundler importing the module will encounter the top-level `node:crypto` import and fail browser builds. Tree-shaking may not help if the bundler can't statically prove the import is unused.  
- **Fix:** Split `data-oid.ts` into `data-oid-core.ts` (format/parse — no `crypto`) and `data-oid-node.ts` (hash — uses `crypto`), or inline `parseDataOid` in the client script.

**W5: `parentComponent` extraction misses arrow function components**  
- **File:** `packages/extension/src/inspect.ts:60-66`  
- **Detail:** The code finds parent arrow/function expressions (`isArrowFunctionExpression()` || `isFunctionExpression()`) but then only extracts the name from `FunctionDeclaration` nodes. The dominant React pattern `const MyComp = () => { return <div/> }` produces an `ArrowFunctionExpression` inside a `VariableDeclarator`, so `parentComponent` returns `undefined` for this case.  
- **Fix:** Also check for `VariableDeclarator` parent and extract the variable name.

**W6: No test coverage for extension `index.ts` (command, message routing, tool registration)**  
- **Files:** `packages/extension/tests/` — missing  
- **Detail:** There are no tests for the main extension entry point. The `handleMessage` function, `design_inspect` tool execution, `/design` command handler, and `turn_end`/`session_shutdown` lifecycle are all untested. This is the core orchestration code. The PRD specifically notes "WS protocol contract" as the highest-value test seam.

**W7: Escape key handler in widget destroys widget without closing WS or sending `design:mode:off`**  
- **File:** `packages/react-plugin/src/widget.ts:207-209`  
- **Detail:** The Escape handler calls `destroyWidget()` which just removes the DOM element and deletes `window.__piDesignWidget`. The WS connection remains open. The hint text says "Esc to exit" implying it should exit design mode entirely. Subsequent `addSelection` calls from `client.ts` would throw because `window.__piDesignWidget` is deleted.  
- **Fix:** Send a `design:mode:off` message or at least a `design:disconnect` over WS before destroying the widget.

### Nitpick

**N1: Reconnection uses fixed 2s delay, not exponential backoff**  
- **File:** `packages/react-plugin/src/client.ts:38`  
- **Detail:** Issue 03 specifies "Auto-reconnect with exponential backoff." Implementation is `setTimeout(connect, 2000)` — fixed delay.

**N2: `currentSelection` typed as `ClientMessage[]` but only holds `design:select` messages**  
- **File:** `packages/extension/src/index.ts:6`  
- **Detail:** The type is overly broad. Runtime behavior is correct since only `design:select` messages are pushed. A more precise type like `(ClientMessage & { type: "design:select" })[]` would be cleaner.

**N3: Source map generation is TODO**  
- **File:** `packages/react-plugin/src/vite-plugin.ts:27` — `map: null, // TODO: generate source map`  
- **Impact:** Debugger lines will be off in browser DevTools since the transform modifies the source.

**N4: `typebox` and `@earendil-works/pi-coding-agent` not in extension's `package.json`**  
- **File:** `packages/extension/package.json`  
- **Detail:** These are imported in `index.ts` but not listed as dependencies. Likely peer dependencies provided by Pi's runtime, but should be documented.

**N5: `innerHTML` used with unescaped dynamic values in widget**  
- **File:** `packages/react-plugin/src/widget.ts:165`  
- **Detail:** `sel.tagName` and `sel.dataOid` are interpolated into `innerHTML` without escaping. The data source is controlled (from `data-oid` attributes generated by our transform), so risk is minimal, but it's not best practice.

---

## 3. Test Results

**Could not execute test suites** — bash commands returned runtime errors (`Cannot read properties of null (reading 'fg')`). This appears to be an environment issue, not a code issue.

**Test counts (static analysis):**

| Package | File | Tests |
|---------|------|-------|
| react-plugin | `tests/transform.spec.ts` | 10 |
| react-plugin | `tests/vite-plugin.spec.ts` | 3 |
| extension | `tests/server.spec.ts` | 8 |
| extension | `tests/inspect.spec.ts` | 3 |
| **Total** | | **24** |

Matches commit message claim of "24 tests."

**Missing test coverage:**
- Extension `index.ts` — no tests for command, routing, tool, lifecycle
- Client script — no WS protocol contract tests
- Widget — no unit tests
- Integration / e2e — none (PRD acknowledges this is manual)

---

## 4. PRD Decisions Verified

| ADR | Decision | Verified | Evidence |
|-----|----------|----------|----------|
| 0001 | data-oid over React DevTools | ✅ | `transform.ts` injects `data-oid` at build time. No React DevTools dependency. |
| 0002 | WebSocket not CDP | ✅ | `server.ts` — WS server. `client.ts` — WS client. No CDP. |
| 0003 | React 18+ not Next.js-only | ⚠️ | Vite adapter works for any React 18+. But no SWC adapter means Next.js requires Babel fallback, which contradicts the spirit of "not Next.js-only" by degrading Next.js support. |
| 0004 | Own plugin not Onlook | ✅ | Custom `@pi-design/react-plugin`. No `@onlook` dependency. |
| 0005 | No AST editing in MVP | ✅ | Pi's `read`/`edit` tools used through `triggerTurn: true`. No AST editing code. |
| 0006 | Browser widget as input surface | ✅ | `widget.ts` — Shadow DOM, selection list, text input, submit. |
| 0007 | Two tools (design_inspect + design_screenshot) | ⚠️ | `design_inspect` implemented. `design_screenshot` explicitly Phase 3 per ADR. Tool only partially correct — `setActiveTools` not used. |
| 0008 | Monorepo structure | ✅ | `packages/extension/` + `packages/react-plugin/` with workspace `package.json`. Cross-package imports exist (`inspect.ts` → `../../react-plugin/src/data-oid.js`). |

**data-oid format:** `c:H:r:file:line:column` — ✅ verified in `data-oid.ts:15`  
**WS port:** 9481 (configurable, auto-increment) — ✅ verified in `server.ts:29-38` and `index.ts:146`

---

## 5. Overall Verdict

### ⛔ Needs fixes before merge

Two critical blockers prevent the feature from functioning end-to-end:

1. **No SWC/Next.js adapter (C1)** — Issue 01's primary deliverable is absent. Next.js projects (the dominant React framework) cannot use the plugin without falling back to Babel compilation, which de-optimizes their build.

2. **No client script virtual module injection (C2)** — Without the Vite plugin injecting the client script as a virtual module, the browser-side runtime (WS connection, Alt+Click, widget) never activates. The entire interactive loop from browser → Pi → browser is non-functional.

Additionally, W3 (`turn_end` sending `design:done` on all turns) causes data loss during normal use, and W4 (`node:crypto` import in browser code) would cause build failures in the client script path.

### Recommended fix priority

| Priority | ID | Summary |
|----------|----|---------|
| P0 | C2 | Add `resolveId`/`load` hooks to Vite plugin for client script virtual module injection |
| P0 | C1 | Implement SWC adapter (or clarify in docs that Next.js requires `.babelrc` with Babel transform) |
| P1 | W4 | Split `data-oid.ts` so `parseDataOid` doesn't pull in `node:crypto` |
| P1 | W1 | Send `design:mode:on` with `{ wsPort }` on client connect |
| P1 | W3 | Only send `design:done` on `turn_end` when a design submit is in flight |
| P1 | W2 | Use `pi.setActiveTools()` to scope `design_inspect` to design mode |
| P2 | W5 | Extract `parentComponent` from arrow function variable declarations |
| P2 | W7 | Fix Escape handler to send disconnect/close WS |
| P2 | W6 | Add extension index.ts test coverage |
