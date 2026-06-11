# Review: feature/18-reload-recovery

**Issue**: #18 — Full-page reload recovery  
**Key file**: `packages/react-plugin/src/vite-plugin.ts` — `persistSelections`, `restoreSelections`  
**Date**: 2026-06-11  
**Bash/tests**: Could not execute — shell infrastructure returned errors. Review is code-static only.

---

## Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Selections persisted to sessionStorage on every change | ✅ Pass | `persistSelections()` called from `addSelection` (line ~384), `removeSelection` (line ~228), `clearAllSelections` (line ~240), and `restoreSelections` (line ~165). All mutation paths covered. |
| 2 | Hard refresh restores selections and highlights | ✅ Pass | `restoreSelections()` called at end of `createWidget()` (line ~413), which runs in `ws.onopen`. Reads from sessionStorage, pushes valid entries to `selections[]`, calls `applyHighlight()` and `render()`. |
| 3 | Missing DOM elements skipped on restore | ✅ Pass | `if (!el) continue;` in `restoreSelections()` (line ~159). After loop, `persistSelections()` is re-called to write back only valid entries (line ~165). |
| 4 | Esc/clear clears sessionStorage | ✅ Pass | `clearAllSelections()` calls `persistSelections()`, which calls `sessionStorage.removeItem("pi-design-selections")` when `selections` is empty (line ~145). Both Esc handler and ✕ button call `clearAllSelections()`. |
| 5 | Processing state not persisted (only selections) | ✅ Pass | `persistSelections()` only serialises `selections[]`. `isProcessing`, `submittedOids` are never written to sessionStorage. |

---

## Review

### Correct

- **Criteria coverage**: All 5 acceptance criteria are satisfied by the implementation.
- **Session-scoped storage**: Correctly uses `sessionStorage` (not `localStorage`), ensuring state doesn't leak across browser sessions/tabs.
- **Defensive coding**: Both `persistSelections()` and `restoreSelections()` wrap operations in `try/catch` with silent handling — appropriate for sessionStorage (can throw in private-browsing or quota-exceeded scenarios).
- **Idempotent restore**: `restoreSelections()` checks `selections.findIndex()` to avoid duplicating already-selected items before pushing (line ~161). Re-calling it on WS reconnect is safe.
- **Re-persist after restore**: After restoring, `persistSelections()` is called again (line ~165) to rewrite only entries whose elements still exist in the DOM. This prunes stale entries.
- **Clear-on-clear path**: `clearAllSelections()` sets `selections = []` then calls `persistSelections()`, which hits the `sessionStorage.removeItem()` branch. No orphaned storage.

### Note

1. **No automated tests for persist/restore logic** — `packages/react-plugin/tests/vite-plugin.spec.ts` has zero references to `persistSelections`, `restoreSelections`, `sessionStorage`, or `pi-design-selections`. The 5 testable behaviours from the acceptance criteria are not exercised by any test. This is a significant gap. The client script is generated as a string (via `generateClientScript()`), making it structurally hard to test. Options: (a) extract persist/restore into separate functions that can be unit-tested with a mock `sessionStorage` and DOM, or (b) set up a jsdom/happy-dom integration test that evaluates the generated script. **Severity: Warning.**

2. **Pre-existing `var` closure bug in `render()`** — Lines ~175–183: `var sel = selections[i]` inside a `for` loop, then closures over `sel.dataOid` in `removeSelection(sel.dataOid)` and `flashElement(sel.dataOid)`. With `var`, all closures capture the same variable, which after the loop ends equals `selections[selections.length - 1]`. Result: every "remove" button and click handler operates on the last selection, not its own. This is NOT introduced by this feature, but it affects the correctness of `removeSelection → persistSelections` in the UI. **Severity: Warning (pre-existing).** Fix: change `var` to `let` or wrap in IIFE.

3. **Stale metadata in restored selections** — Restored selection objects carry `computedStyles`, `boundingBox`, `selector`, `textContent` from before the page refresh. After a full reload, these values may be incorrect. Currently acceptable because: (a) `design:submit` only sends OIDs; (b) the server derives file/position from OID parsing; (c) the widget UI displays `tagName` and file location (derivable from OID). If future features rely on stored computed styles, this will need re-computation on restore. **Severity: Low.**

4. **Restore does not re-notify server** — `restoreSelections()` pushes entries into `selections[]` and applies highlights, but does NOT send `design:select` messages to the server. The server-side selection state diverges from the client after a page reload. Impact is mitigated because `design:submit` sends OIDs directly, but if the server tracks selections for other purposes (e.g., collaborative highlighting), it will miss the restored selections. **Severity: Low.**

5. **Restoration timing vs. DOM readiness** — `restoreSelections()` runs at the end of `createWidget()`, which fires in `ws.onopen`. There is a risk that React/hydration has not yet rendered all `data-oid` elements at that point, so those elements would be silently skipped. The re-persist call prunes them, meaning they're permanently lost (not retried later). A future improvement could use a `MutationObserver` or `requestAnimationFrame` retry, but for the current use case this is acceptable. **Severity: Low.**

6. **`design:mode:off` / `disconnect()` does not clear sessionStorage** — When the server sends `design:mode:off`, `disconnect()` → `destroyWidget()` runs but sessionStorage is left intact. On the next page load, stale selections from a previous "design mode off" session would be restored. This is arguably fine (the restored state would be overwritten or cleared on first user interaction), but could confuse if `design:mode:off` was meant to fully reset the client. **Severity: Low.**

---

## Summary

| Category | Count |
|----------|-------|
| Blocker | 0 |
| Warning | 2 (no tests for feature; `var` closure bug — pre-existing) |
| Note | 4 (stale metadata, no server re-notify, DOM timing, `design:mode:off` cleanup) |

**Verdict**: All 5 acceptance criteria are implemented correctly. The feature is functionally sound for its intended use case. The two warnings should be addressed before broader use: (1) add automated tests for the persist/restore behaviours, and (2) fix the `var` closure bug in `render()` (a `let` substitution is sufficient). Neither blocks the current feature from working in the common case.
