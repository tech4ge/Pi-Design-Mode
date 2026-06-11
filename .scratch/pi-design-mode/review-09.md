# Review: feature/09-post-edit-flash

**Reviewer:** automated review subagent  
**Date:** 2026-06-11  
**Status:** ✅ Pass with notes

---

## Acceptance Criteria Verification

### 1. After `design:done`, previously-submitted elements flash green for ~2s

**Correct.** The flow is complete and correct:

- `handleServerMessage` receives `design:done` → calls `setProcessing(false)` then `flashEditedElements()` (vite-plugin.ts:349–351)
- `setProcessing(true)` (called earlier on `design:processing`) stashes `submittedOids` from `selections` before clearing them (vite-plugin.ts:293–294)
- `flashEditedElements()` waits 500ms for HMR, then applies `2px solid #a6e3a1` outline to each found element, and removes the outline after 2000ms (vite-plugin.ts:212–229)
- The `design:done` message is broadcast from `extension/src/index.ts:235` only when `designTurnInFlight` is true

The color `#a6e3a1` is Catppuccin Mocha green — consistent with the existing palette used for connection indicator `.dot.connected`.

### 2. Missing elements (removed by edit) handled gracefully

**Correct.** Line 217: `var el = document.querySelector(...)` returns `null` if the element no longer exists after HMR re-render. The `if (el)` guard on line 218 silently skips missing elements. No error is thrown.

### 3. Green flash clears cleanly after timeout

**Correct.** Each matched element gets its outline/outlineOffset cleared in a closure-captured `setTimeout` after 2000ms (vite-plugin.ts:222–226). The IIFE `(function(element){...})(el)` correctly captures the DOM reference so cleanup cannot target the wrong element.

**Note:** If HMR replaces the element *during* the 2s flash window, the captured `element` reference would point to a detached DOM node. The style removal on a detached node is a no-op (no visual artifact, no error). The new element won't have the green outline. This is acceptable behavior but worth documenting as a known edge case.

### 4. Does not interfere with subsequent selections

**Correct.** By the time `flashEditedElements` runs:
- `setProcessing(false)` has already cleared `selections = []` and removed all selection highlights
- `isProcessing = false` so the widget is receptive to new Alt+Click selections
- `submittedOids` is cleared at the end of the flash callback (vite-plugin.ts:229)
- The green outline targets are tracked by DOM reference, not by `data-pi-highlighted` attribute, so they don't interfere with `reapplyAllHighlights()` or `applyHighlight()` logic

---

## Code Quality

### Correct

- **Closure capture of DOM element** in the 2s timeout (line 222): prevents stale `submittedOids[i]` lookups if the array is modified during the timeout.
- **IIFE pattern** correctly avoids the classic `var`-in-loop closure bug.
- **500ms HMR delay** is a reasonable heuristic before querying the DOM.
- **Early return** when `submittedOids.length === 0` (line 213): avoids unnecessary `setTimeout`.
- **`submittedOids` reset** at line 229 inside the timeout callback: ensures it's cleared only after the flash query completes.

### Note: Ordering dependency in `handleServerMessage`

Lines 349–351:
```js
case "design:done":
  if (window.__piDesignWidget) window.__piDesignWidget.setProcessing(false);
  if (window.__piDesignWidget) window.__piDesignWidget.flashEditedElements();
  break;
```

`setProcessing(false)` clears `selections` and removes selection highlights. Then `flashEditedElements()` reads from `submittedOids` (which was stashed during `setProcessing(true)`). The ordering is correct but fragile — if `setProcessing(false)` were to also clear `submittedOids`, the flash would silently fail. Currently safe because `setProcessing(false)` doesn't touch `submittedOids`, but this is a latent coupling risk.

**Recommendation:** Add a comment near `setProcessing(false)` noting that `submittedOids` must survive the call, or move the stash logic out of `setProcessing` into an explicit `stashSubmittedOids()` call that's invoked in `handleServerMessage` before `setProcessing(false)`.

### Note: No `data-pi-highlighted` attribute on flashed elements

The green flash sets `outline` and `outlineOffset` directly on the element but does NOT set `data-pi-highlighted="true"`. This is correct — the flash is temporary and shouldn't interact with `reapplyAllHighlights()`. However, if a user Alt+Clicks a currently-flashing element to select it, `applyHighlight` will overwrite the green outline with the selection color immediately. This is acceptable (selection takes priority over flash) but the original 2s timeout will still fire and clear the selection outline prematurely.

**Risk level:** Low. The user would need to Alt+Click an element *during* the 2s flash window. If they do, the selection highlight will be cleared after the flash timeout. A fix would be to check if the element is currently selected before clearing the outline in the flash timeout, but this is an edge case that can be addressed later.

### Note: No automated tests

The issue explicitly states "No automated test seam (browser DOM code). Manual test only." The existing `vite-plugin.spec.ts` tests don't cover the client script (they test the Vite plugin interface, not the generated browser code). This is acceptable per the issue spec but means the flash logic has zero automated coverage.

---

## Summary

| Category | Finding |
|---|---|
| **Correct** | All 4 acceptance criteria met. Flash flow is sound: stash → done → 500ms delay → green outline → 2s clear. Missing elements gracefully skipped. No interference with subsequent selections. |
| **Note** | Latent ordering coupling: `setProcessing(false)` must not clear `submittedOids`. Currently safe but fragile. |
| **Note** | If user Alt+Clicks a flashing element, the flash timeout will clear the selection outline. Low-risk edge case. |
| **Note** | If HMR replaces an element during the 2s flash, the cleanup applies to a detached node (harmless no-op). |
| **Note** | No automated test coverage for the flash feature (expected per issue spec: DOM-only, manual test). |

**Verdict:** Implementation is correct and minimal. No blockers. Notes are low-risk edge cases that can be followed up incrementally.
