# Review: feature/15-quick-actions

**Reviewer**: automated review subagent  
**Date**: 2026-06-11  
**Branch**: `feature/15-quick-actions`  
**Issue**: #15 — Quick action buttons (Center, Full width, Equal spacing, Same size)

---

## Summary

The feature adds four quick-action pill buttons to the Pi Design Mode widget. "Center" and "Full width" show whenever ≥1 element is selected; "Equal spacing" and "Same size" are gated by a `data-multi` attribute and only appear when ≥2 elements are selected. Clicking any button populates the textarea and immediately submits.

---

## Correct

1. **Quick-actions HTML structure matches the issue spec.**  
   `vite-plugin.ts:132–136` — Four `<button class="qa-btn">` elements inside a `<div class="quick-actions">`, with `data-action` and `data-multi` attributes. This matches the interface spec in the issue exactly.

2. **Visibility logic is correct.**  
   `vite-plugin.ts:196` — `quickActions.style.display = selections.length > 0 && !isProcessing ? "flex" : "none"` ensures:
   - Buttons are hidden when no elements are selected ✅
   - Buttons are hidden during processing ✅
   - Buttons appear when ≥1 element is selected ✅

3. **Multi-selection gating works correctly.**  
   `vite-plugin.ts:197–199` — Iterates `qaMultiBtns` (the two buttons with `data-multi="true"`) and sets `display: none` when `selections.length < 2`. This matches AC #2: "Equal spacing" and "Same size" only show with ≥2 selections ✅

4. **One-click submit works correctly.**  
   `vite-plugin.ts:422–429` — The click handler on `quickActions` uses event delegation (`e.target.closest(".qa-btn")`), reads the `data-action`, looks up the instruction text in `qaInstructions`, sets `input.value`, and then calls `submitBtn.click()`. This triggers the existing submit handler, which includes the `structuralContext`, trims input, sends `design:submit`, and transitions to processing state ✅

5. **Manual textarea input still works.**  
   The quick-actions handler sets `input.value` and clicks submit — it does not replace or interfere with manual typing. The textarea's `input` and `keydown` listeners are unchanged ✅

6. **Processing guard on quick-action click.**  
   `vite-plugin.ts:423` — `if (!btn || isProcessing) return` prevents double-submission while processing ✅

7. **CSS pill styling is clean.**  
   `vite-plugin.ts:117–120` — Pill buttons with subtle hover, disabled state. Matches the spec's "pill-shaped" requirement ✅

8. **Instruction text is appropriate.**  
   `vite-plugin.ts:417–421` — Each action maps to a clear natural-language instruction that works well as an LLM prompt ✅

---

## Blocker

None.

---

## Note

1. **No automated tests for quick-action logic.**  
   The existing test suite (`vite-plugin.spec.ts`, `transform.spec.ts`) covers data-oid injection, transform, and client script generation, but has **zero test coverage** for the quick-action feature. The client script is auto-generated JS inside a template string, making it difficult to unit-test directly, but the plugin's `load()` hook output could be inspected for quick-action HTML/CSS/JS strings. Per the project's testing strategy ("don't unit-test orchestration"), this might be acceptable — the quick-action logic is wiring (set input + click submit), not business logic. However, the visibility toggling (`selections.length > 0`, `selections.length >= 2`) could be tested by parsing the generated script. **Recommendation**: Consider adding a test that loads the client script and asserts it contains the quick-action HTML, the `qaInstructions` map, and the `qaMultiBtns` visibility logic.

2. **Minor: single-element instruction says "these elements".**  
   `qaInstructions.center = "Center these elements"` — when only one element is selected, the instruction reads "Center these elements" which is grammatically plural. Not a bug per se (the LLM will understand it), but worth noting. A future enhancement could use singular/plural based on selection count.

3. **CSS `margin-top: 6px` vs issue spec's `margin-bottom: 6px`.**  
   The issue HTML example had `margin-bottom: 6px`; the implementation uses `margin-top: 6px`. Functionally equivalent since the quick-actions div sits between the input-row and processing indicator — the spacing is preserved. No visual issue.

4. **`.qa-btn:disabled` style exists but disabled state is never set in JS.**  
   `vite-plugin.ts:120` defines `.qa-btn:disabled { opacity: 0.4; cursor: not-allowed; }` but no code ever sets `disabled` on `.qa-btn` elements. The processing guard returns early from the click handler, and visibility is controlled via `display: none`. The disabled CSS rule is dead code. Harmless but unnecessary.

---

## Acceptance Criteria Verdict

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Quick action buttons visible when elements selected | ✅ PASS | `vite-plugin.ts:196` — `selections.length > 0 && !isProcessing` |
| 2 | "Equal spacing" and "Same size" only show with ≥2 selections | ✅ PASS | `vite-plugin.ts:197–199` — `qaMultiBtns` hidden when `selections.length < 2` |
| 3 | Clicking a quick action submits the instruction immediately | ✅ PASS | `vite-plugin.ts:426–428` — sets `input.value` then calls `submitBtn.click()` |
| 4 | Manual textarea input still works | ✅ PASS | Quick-action handler only sets value + clicks submit; textarea listeners unchanged |
