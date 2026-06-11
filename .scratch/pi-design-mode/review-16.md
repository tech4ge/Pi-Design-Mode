# Review: feature/16-instruction-history

**Issue**: [.scratch/pi-design-mode/issues/16-instruction-history.md](.scratch/pi-design-mode/issues/16-instruction-history.md)  
**Key file**: `packages/react-plugin/src/vite-plugin.ts` (client script in `generateClientScript`)  
**Date**: 2026-06-11

---

## Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Submit saves instruction to localStorage history (max 20) | ✅ Pass | `saveHistory(instruction)` called at line 415 in `submitBtn` click handler. Deduplicates, prepends, caps at 20 via `h.slice(0, 20)`. |
| 2 | Dropdown appears on textarea focus when empty | ✅ Pass | `input.addEventListener("focus", ...)` calls `showHistory()`. `showHistory()` checks `input.value.length > 0` — hides dropdown if textarea has content, shows if empty. |
| 3 | Clicking history item fills textarea (no auto-submit) | ✅ Pass | `historyDropdown` `mousedown` handler: sets `input.value = item.textContent`, hides dropdown, calls `input.focus()`. Does NOT call `submitBtn.click()`. |
| 4 | History persists across page reloads | ✅ Pass | Uses `localStorage` under key `"pi-design-history"`. `getHistory()` reads from `localStorage` on each invocation. |
| 5 | Clear history option available | ✅ Pass | "Clear history" element with class `.history-clear` appended in `showHistory()`. `mousedown` handler calls `localStorage.removeItem("pi-design-history")`. |

---

## Correct

- **Blur/mousedown race condition handled correctly**: The `blur` handler on the textarea sets a 200ms `setTimeout` to hide the dropdown. The `mousedown` event on the dropdown fires *before* `blur` completes, so clicking a history item fills the textarea and the dropdown is already hidden by the time the timeout fires. This is the standard pattern for this type of interaction.
- **Deduplication with recency promotion**: Re-submitting the same instruction removes it from its old position and prepends it (line 209). This is good UX — most recent instructions always appear at top.
- **Empty instruction guard**: `saveHistory` returns early on `!instruction.trim()`, preventing blank entries.
- **Defensive localStorage wrapping**: All `localStorage` reads/writes are wrapped in `try/catch`, handling `SecurityError` or `QuotaExceededError` in restricted contexts (e.g. iframes, incognito).
- **XSS-safe rendering**: History items use `item.textContent = h[i]` (not `innerHTML`), preventing script injection via crafted instruction text.
- **CSS styling**: Dropdown uses `position: absolute; bottom: 100%` (above the input row), `max-height: 160px`, `overflow-y: auto`, `z-index: 10` — consistent with the widget's Catppuccin theme and specified dimensions.
- **Consistent naming**: localStorage key `"pi-design-history"` matches the issue specification.

---

## Note

1. **↓ arrow key not implemented**: The issue "What to build" section specifies showing the dropdown on "user presses ↓ arrow", but this is not implemented. The acceptance criteria do not include this behaviour, so it's not a blocker — but it's a gap between the issue description and implementation. Users with text in the textarea cannot access history via keyboard.

2. **Dropdown position differs from spec**: The issue says "positioned below the `.input-row`", but the implementation uses `bottom: 100%` which positions it *above* the input row. This is actually better UX given the widget is at the bottom-right of the viewport — a dropdown below the input would push into the page or be clipped. Not a problem in practice, but deviates from spec text.

3. **No history text truncation in CSS**: `.history-item` has no `text-overflow: ellipsis; white-space: nowrap; overflow: hidden` rules. Long instructions will wrap to multiple lines within each item, which could make the dropdown tall and harder to scan. Minor UX improvement opportunity.

4. **Blur timeout not cleaned up**: When a history item is clicked, the `blur` handler's 200ms `setTimeout` is not cancelled. It fires harmlessly (dropdown is already `display:none`), but the timer is wasted. A `clearTimeout` on the stored timer ID would be cleaner.

5. **No dedicated tests for history logic**: `vite-plugin.spec.ts` has 7 tests covering data-oid injection, virtual module resolution, and client script generation — but none verify the history feature. The client script is generated as a string, making it hard to unit-test the JS behaviour directly. At minimum, tests should verify:
   - `generateClientScript` output contains `saveHistory`, `showHistory`, `getHistory`, `pi-design-history`
   - The 20-item cap logic
   - The clear-history handler

6. **Quick-actions also call submitBtn.click() which triggers saveHistory**: Quick action buttons (Center, Full width, etc.) set `input.value` then call `submitBtn.click()`, which triggers the submit handler that calls `saveHistory`. This means quick-action instructions are saved to history, which seems intentional — they'll appear as reusable history items.

---

## Summary

All 5 acceptance criteria are met. The implementation is correct, handles edge cases (blur/mousedown race, XSS, localStorage failures), and follows established code patterns. The main gaps are: (1) missing ↓ arrow key trigger for history dropdown (in issue description but not AC), (2) no text truncation on long history items, and (3) no test coverage for the new history logic. None are blockers.
