# Review: feature/11-widget-ux

**Date:** 2026-06-11
**Issue:** #11 — Widget UX improvements

## Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Textarea replaces input with auto-grow (max 120px) | ✅ | `<textarea rows="1">` at line 120; CSS `max-height: 120px; resize: none; overflow-y: auto;` at line 106; `autoGrow()` caps at `Math.min(input.scrollHeight, 120)` at line 313 |
| 2 | Shift+Enter adds newlines, Enter submits | ✅ | `keydown` handler at lines 318–319: `if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitBtn.click(); }` — Shift+Enter bypasses the handler naturally |
| 3 | Widget expands on textarea focus, contracts on blur | ✅ | focus→`classList.add("expanded")` line 322; blur→`classList.remove("expanded")` line 323; CSS `.widget.expanded { min-width: 380px; }` line 90 |
| 4 | Selection list max-height increased to 180px | ✅ | `.selections { max-height: 180px; overflow-y: auto; }` line 97 |
| 5 | Smooth width transition on expand/collapse | ✅ | `.widget { transition: min-width 0.2s ease; }` in line 89 |
| 6 | Submit clears textarea and resets to 1 row | ✅ | `input.value = ""; input.style.height = "auto";` lines 303–304 — `auto` resolves to `rows="1"` height |

---

## Correct

- **Complete `<input>` → `<textarea>` migration.** Grep confirms zero remaining `<input` references; selector updated from `querySelector("input")` to `querySelector("textarea")` (line 132). No stale references anywhere.

- **Auto-grow implementation is the standard pattern.** The `autoGrow()` function (lines 311–313) first resets to `auto` to get an accurate `scrollHeight`, then sets height to `scrollHeight` capped at 120px. This is the canonical textarea auto-resize technique used in ChatGPT, Cursor, etc.

- **CSS constraints are double-safe.** `max-height: 120px` in the stylesheet (line 106) and `Math.min(input.scrollHeight, 120)` in JS (line 313) both cap at 120px. Even if the JS cap fails, the CSS prevents overflow.

- **Enter/Shift+Enter handling is clean.** Only `Enter` without `Shift` is intercepted and redirected to `submitBtn.click()`. With `Shift` held, `e.shiftKey` is `true`, the guard fails, and the default browser behavior (inserting a newline) proceeds. No special newline-insertion code needed.

- **`.input-row` layout with `align-items: flex-end`** (line 105). When the textarea grows, the submit button stays anchored to the bottom — correct and consistent with standard chat UX.

- **Escape key handler already excludes textarea.** Line 326: `document.activeElement !== input` prevents accidental selection clearing while the user is typing.

- **Previous review-10 blocker (sibling grouping) is fixed.** `computeStructuralContext()` now uses `Map` with `el.parentElement` as key (lines ~264–274) instead of the old broken string key pattern.

---

## Blocker

None.

---

## Notes

1. **Minor UX: widget contracts on blur before submit processes.** When the user clicks the Submit button, the blur event fires first (removing `.expanded`), then the click handler fires. This causes a brief visual contraction of the widget before "⏳ Processing..." appears. This is correct per the spec ("contracts on blur"), but could feel slightly jarring. A small improvement would be to delay the `classList.remove("expanded")` with a short timeout or add a `.processing` class that keeps the widget expanded, but this is optional polish — not a bug.

2. **No automated tests for the new widget behaviors.** The issue explicitly states "Manual test only (browser DOM code)" under "Behaviours to test", so this is expected. The existing vitest suite only verifies that the client script generates and loads correctly (test "loads client script from virtual module"). Consider adding smoke assertions — e.g., verifying the generated script contains `<textarea`, `autoGrow`, `expanded`, and `max-height: 180px` — to catch regressions if the template string is accidentally modified.

3. **`overflow-y: auto` on textarea may show an OS-level scrollbar** at exactly the 120px boundary. `overflow-y: auto` is the correct choice (vs `scroll` which always shows a track), but on some OS/FF combinations the scrollbar thumb may flash briefly. If this becomes an issue, a styled scrollbar via `::-webkit-scrollbar` in the shadow DOM CSS could help. Not a blocker.

4. **`line-height: 1.4` on textarea (line 106)** — the auto-grow cap of 120px means approximately 6–7 visible lines depending on font size. This is reasonable for short instructions; longer prompts will scroll. Consistent with the issue spec.
