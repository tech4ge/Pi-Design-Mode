# Review: fix/18-reload-recovery

**Issue**: #18 — Full-page reload recovery not working on Next.js  
**Key file**: `packages/react-plugin/src/browser-client.ts` — `applyRestoredSelections()`, `restoreSelections()`, `persistSelections()`  
**Date**: 2026-06-12  
**Bash/tests**: Could not execute — shell infrastructure returned `Cannot read properties of null (reading 'fg')` for all commands. Review is code-static only.

---

## Root Cause Verification

The task describes two bugs:
1. **No retry/watch** — `findByOid()` returned null for everything before Next.js hydration.
2. **`persistSelections()` wiped sessionStorage** — when nothing was found, selections was empty, so `persistSelections()` called `sessionStorage.removeItem()`.

**Verified against current code:**

- Bug 1: ✅ Fixed. `applyRestoredSelections()` (line 117) now does a first pass on whatever is in the DOM, then sets up a `MutationObserver` (line 141) that watches for missing elements to appear. When elements appear, it restores highlights and disconnects. 10s safety timeout (line 170).

- Bug 2: ✅ Fixed. `restoreSelections()` (line 105) no longer calls `persistSelections()` after restoration. Instead, `applyRestoredSelections()` calls `sessionStorage.removeItem("pi-design-selections")` only when all elements are successfully restored (lines 130, 159). The `persistSelections()` function is still used by `addSelection`, `removeSelection`, and `clearAllSelections` — but NOT by the restore path, which prevents the premature wipe.

---

## Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Selections persisted to sessionStorage on every change | ✅ Pass | `persistSelections()` called from `addSelection` (line 275), `removeSelection` (line 284), `clearAllSelections` (line 293). All mutation paths covered. |
| 2 | Hard refresh restores selections and highlights | ✅ Pass | `restoreSelections()` called at end of `createWidget()` (line 534). Reads from sessionStorage, calls `applyRestoredSelections()` which pushes valid entries to `selections[]`, calls `applyHighlight()` and `render()`. If not all elements in DOM yet, MutationObserver watches for them (line 141). |
| 3 | Missing DOM elements skipped on restore | ✅ Pass | `if (!el) continue;` in `applyRestoredSelections()` (line 122). MutationObserver retries missing elements; if they never appear, the 10s timeout disconnects the observer and moves on. |
| 4 | Esc/clear clears sessionStorage | ✅ Pass | `clearAllSelections()` calls `persistSelections()` → `sessionStorage.removeItem("pi-design-selections")` when `selections` is empty (line 101). Both Esc handler and ✕ button call `clearAllSelections()`. |
| 5 | Processing state not persisted (only selections) | ✅ Pass | `persistSelections()` only serialises `selections[]`. `isProcessing`, `submittedOids` are never written to sessionStorage. |

---

## Code Review

### Correct

- **Root cause properly addressed**: Both bugs (no retry, premature wipe) are fixed with a clean `MutationObserver` pattern. The observer is properly scoped to `document.body`, uses `childList: true, subtree: true` which catches all DOM additions.
- **No longer calls `persistSelections()` on restore path**: This was the critical fix. The old code called `persistSelections()` which would wipe storage when `selections` was empty (nothing found yet). Now `sessionStorage.removeItem()` is only called when all elements are successfully restored.
- **10s safety timeout**: Prevents the observer from running indefinitely if elements never appear (line 170). Good defensive practice.
- **First pass + observer pattern**: Makes immediate elements work without waiting for observer to fire, while still catching late-hydrated elements.
- **Idempotent restore**: Checks `selections.findIndex()` before pushing (lines 121, 146, 151) to avoid duplicating already-selected items.
- **Session-scoped storage**: Correctly uses `sessionStorage` (not `localStorage`), ensuring no cross-session leaks.
- **`var` closure bug fixed**: Previous review noted a `var sel` in `render()` causing closure bugs. Current code uses `const sel = selections[i]` (line 529). ✅
- **`disconnect()` now clears sessionStorage**: Line 743: `sessionStorage.removeItem("pi-design-selections")` called on disconnect. Previous review noted this was missing. ✅

### Warning

1. **No automated tests for the new MutationObserver/restore logic** — `packages/react-plugin/tests/browser-client.spec.ts` validates the build artifact exists and contains function names, but has zero tests for:
   - `restoreSelections()` reading from sessionStorage
   - `applyRestoredSelections()` first-pass + observer pattern
   - MutationObserver disconnecting after all elements restored
   - 10s timeout disconnecting the observer
   - sessionStorage NOT being cleared prematurely when elements are missing
   
   The client script is generated as a self-executing IIFE, making it structurally hard to unit-test. However, the restore logic is the core of this fix and the most fragile part — it deserves tests. Options: (a) extract the logic into testable functions, or (b) use jsdom/happy-dom integration tests. **Severity: Warning.**

2. **MutationObserver callback closure over `missingOids` is frozen** — The `missingOids` array (line 137) is captured in the observer callback, but it is never updated. If the observer fires and restores some but not all elements, `missingOids` still contains the original full list. The callback correctly re-checks `selections.findIndex()` and `findByOid()` each time, so this doesn't cause incorrect behavior — it just means redundant `filter` calls over already-restored OIDs. No bug, but slightly wasteful. **Severity: Nitpick.**

3. **Observer not cleaned up if widget is destroyed** — If `disconnect()` → `destroyWidget()` is called while the MutationObserver is still running (e.g., within the 10s window), the observer continues to run and will attempt to call `applyHighlight()`, `render()`, and `selections.push()` on a destroyed widget. Since `render()` checks `if (!shadow) return` (line 524), it won't crash, but `selections.push()` and `applyHighlight()` will still execute on stale state. The observer should be stored in a module-level variable and disconnected in `destroyWidget()`. **Severity: Warning.**

4. **`found === 0` path does not create observer if some were already selected** — If `restoreSelections()` is called when `selections.length > 0` (the guard at line 111 prevents this), the function returns early. Good. But within `applyRestoredSelections()`, if all saved items already exist in `selections` (i.e., `found === 0` and `missingOids.length === 0`), no observer is created and `sessionStorage.removeItem()` is NOT called. This means items that are already selected don't trigger cleanup of sessionStorage. However, this path is unreachable due to the guard at line 111 (`selections.length > 0`), so it's fine in practice. **Severity: Nitpick.**

5. **`render()` called from observer without checking widget state** — Line 153: `render()` is called inside the MutationObserver callback. If the widget has been destroyed (shadow root removed), `render()` will early-return on `if (!shadow) return` (line 524). However, the `selections.push(s)` at line 149 and `applyHighlight()` at line 150 run before `render()`, so they will execute on potentially-stale state. This is the same concern as finding #3. **Severity: Warning (same root cause as #3).**

### Nitpick

1. **`stillMissing` variable is computed but only used for comparison** — Line 143: `stillMissing` is computed to check `if (stillMissing.length === missingOids.length) return`. This is a micro-optimisation to skip `findIndex` + `findByOid` calls when no DOM changes are relevant. Correct but could be simplified by just checking if `nowFound.length === 0` (line 148). **Severity: Nitpick.**

2. **Inconsistent color assignment for observer-restored elements** — In the first pass (line 125), `SELECTION_COLORS[(selections.length - 1) % SELECTION_COLORS.length]` uses `selections.length - 1` because `selections.push(s)` happened on the line before. In the observer callback (line 150), the same formula is used after `selections.push(s)` (line 149). This is correct but relies on push order — if selections are ever re-ordered, colors would shift. Not a bug in current code. **Severity: Nitpick.**

3. **`document.body \|\| document.documentElement` fallback** — Line 164: If `document.body` is null (e.g., during early page load), it falls back to `document.documentElement`. This is defensive but the observer on `document.documentElement` with `subtree: true` should work. However, if `applyRestoredSelections()` runs before `document.body` exists, the page is probably not ready at all. **Severity: Nitpick.**

---

## Test Results

**Could not execute tests.** Shell infrastructure returned `Cannot read properties of null (reading 'fg')` for all commands including `echo hello`, indicating a broken shell environment, not a test failure. Manual verification:

- `packages/react-plugin/tests/browser-client.spec.ts`: Tests build artifact existence and content, not runtime behavior. No tests cover the new `applyRestoredSelections()` or `MutationObserver` logic.
- `packages/react-plugin/tests/transform.spec.ts`: Unrelated to this fix.
- `packages/react-plugin/tests/vite-plugin.spec.ts`: Unrelated to this fix.

---

## Summary

| Category | Count |
|----------|-------|
| Blocker | 0 |
| Warning | 2 (no tests for new logic; MutationObserver not cleaned up on widget destroy) |
| Nitpick | 4 (frozen missingOids, unreachable cleanup path, stillMissing optimization, color assignment) |

**Verdict: Merge-ready with caveats.** The root cause is properly fixed. Both bugs (no retry, premature sessionStorage wipe) are addressed. The fix is minimal and focused. The two warnings (no tests, observer cleanup) are real but not blockers — the observer cleanup issue only manifests if the user explicitly disconnects during a restore, and the no-tests issue is a pre-existing structural limitation. Recommend addressing both in a follow-up.
