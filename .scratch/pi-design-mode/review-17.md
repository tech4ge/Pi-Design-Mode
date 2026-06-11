# Review: feature/17-selection-recall

**Reviewed:** 2026-06-11  
**Key file:** `packages/react-plugin/src/vite-plugin.ts`  
**Issue:** `.scratch/pi-design-mode/issues/17-selection-recall.md`

---

## Correct

1. **`lastSelections` stash mechanism works on submit.** Line 430: `lastSelections = selections.slice()` correctly snapshots the current selections before processing begins. The `.slice()` creates a shallow copy, preventing aliasing issues when `selections` is later mutated.

2. **Alt+R handler has sensible guard conditions.** Line 500–506: The handler checks `selections.length === 0` (no current selections), `lastSelections.length > 0` (something to recall), `!isProcessing` (not mid-submit), `!e.ctrlKey && !e.metaKey` (no accidental modifier combos). These are all appropriate guards.

3. **Missing DOM elements are silently skipped.** Line 503: `if (!el) continue;` — elements removed by HMR don't cause errors; they're just skipped. Meets acceptance criterion #2.

4. **No-op when no previous selection exists.** The `lastSelections.length > 0` guard ensures nothing happens if there's nothing to recall. Meets acceptance criterion #4.

5. **Highlights are re-applied with color-coded outlines.** Called through `addSelection()` → `applyHighlight()` using `SELECTION_COLORS[(selections.length - 1) % ...]`. Since elements are added sequentially, they get distinct colors matching the widget's selection list. Meets acceptance criterion #3.

6. **`persistSelections()` is called by `addSelection`.** Recalled selections are persisted to sessionStorage, surviving page reloads.

7. **Existing unit tests still pass** (for transform logic, parse round-trip, virtual module loading, etc.). No regressions introduced in the plugin transform pipeline.

---

## Blocker

None.

---

## Note

1. **No visual feedback (pulse/flash) on recall.** The issue spec explicitly states: *"Brief flash/pulse on restored elements so user sees what was re-selected."* The current implementation silently re-applies outlines without any pulse animation. The `flashElement()` function already exists in the codebase (line ~295–303) and does exactly a scroll-into-view + offset pulse. Consider calling `flashElement(dataOid)` for each recalled element after adding it, so the user gets visual confirmation of what was re-selected. Without this, the user may not notice that Alt+R did anything — especially if the recalled elements are off-screen.

2. **Stale selection metadata on recall.** `lastSelections` stores full selection objects including `computedStyles`, `boundingBox`, `selector`, and `textContent`. After HMR re-renders elements, the DOM elements may have moved, changed styles, or changed text. These stale values are pushed back into `selections` via `addSelection(lastSelections[i])`. If a future feature relies on accurate `boundingBox`/`computedStyles` from recalled selections, this would be incorrect. **Currently low risk** since the server already received the original data from `design:submit` and the recalled selections only need the `dataOid` for highlighting.

3. **No `design:select` WS message sent on Alt+R recall.** When `addSelection()` is called programmatically from the Alt+R handler, no `design:select` message is sent to the server (only `handleAltClick` sends that message, line 656). This means the server's view of current selections will diverge from the client's after an Alt+R recall. **Currently low risk** — the server doesn't seem to rely on `design:select` for anything beyond logging/display — but if server-side selection tracking is added, this will be a bug.

4. **Hint text doesn't mention Alt+R.** The widget hint (line 146 and line 354) reads "Alt+Click to select · Esc to clear" but doesn't mention the new Alt+R shortcut. Consider updating to "Alt+Click to select · Alt+R to recall · Esc to clear" or similar, so the feature is discoverable.

5. **No dedicated tests for Alt+R feature.** The client script is generated as a string inside `generateClientScript()`, making it inherently difficult to unit-test. The existing tests verify the Vite plugin pipeline (transform, virtual module, import injection) but not browser-side keyboard behavior. This is an architectural limitation, not a defect — but it means the 4 acceptance criteria cannot be verified automatically. Manual browser testing is the current verification path.

6. **`selections.length === 0` guard may be too restrictive.** The Alt+R handler only works when `selections.length === 0`. After a submit completes, `setProcessing(false)` is called which re-applies highlights and keeps selections intact. The user would need to press Esc (or manually remove all selections) before Alt+R works. This is likely intentional — Alt+R is for when you've cleared and want to go back — but the workflow "submit → Esc to clear → Alt+R to recall" requires two extra keystrokes. An alternative would be to allow Alt+R to *add* recalled elements to existing selections (removing the `selections.length === 0` check), but that could cause confusion. The current design is defensible; just flagging the tradeoff.
