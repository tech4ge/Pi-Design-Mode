# Review: feature/07-alt-hover-tooltip

**Reviewer**: automated review subagent  
**Date**: 2026-06-11  
**Branch**: `feature/07-alt-hover-tooltip`  
**Issue**: `.scratch/pi-design-mode/issues/07-alt-hover-tooltip.md`

---

## 1. Acceptance Criteria Checklist

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Alt+hover shows tooltip with component tag + file:line parsed from `data-oid` | ✅ | `vite-plugin.ts:395-413` — `showHoverTooltip()` parses the `data-oid` via `parseDataOid()`, extracts `filePath:line` as `location`, gets `tagName` via `document.querySelector`, and renders both in the tooltip `<div>`. |
| 2 | Tooltip follows cursor on mousemove | ✅ | `vite-plugin.ts:423-427` — `mousemove` handler updates `hoverTooltip.style.left` and `hoverTooltip.style.top` using `e.clientX + 12` / `e.clientY + 12`. |
| 3 | Releasing Alt or leaving element hides tooltip | ✅ | `vite-plugin.ts:389-392` — `keyup` for Alt sets `isAltDown = false` and calls `hideHoverTooltip()`. `vite-plugin.ts:429-431` — `mouseout` handler hides tooltip when leaving a `[data-oid]` element boundary. |
| 4 | No tooltip when design mode is not connected | ✅ | `vite-plugin.ts:419` — `mouseover` guard: `if (!isAltDown || !window.__piDesignWidget) return;`. Widget is only created on WS connect and destroyed on disconnect (`destroyWidget` at line 281), so `window.__piDesignWidget` is `undefined` when disconnected. |
| 5 | No interference with normal hover/click events | ✅ | Tooltip has `pointer-events:none` (`vite-plugin.ts:398`), so it cannot capture or block mouse events. The Alt+Click handler (`handleAltClick`) uses `capture: true` and `stopPropagation` only when Alt is held — unchanged by this feature. The `mouseover`, `mousemove`, `mouseout` listeners do not call `preventDefault` or `stopPropagation`. |

---

## 2. Code Review Findings

### Critical

None.

### Warning

**W1: `innerHTML` used without HTML escaping for tooltip `location`**  
- **File**: `vite-plugin.ts:411`  
- **Detail**: `hoverTooltip.innerHTML = '...' + location + '...'` — the `location` variable (`parsed.filePath + ":" + parsed.line`) is interpolated directly into `innerHTML` without escaping. In contrast, the widget selection rendering at line 150 uses `escapeHtml()` for the same kind of data.  
- **Risk**: If a `data-oid` attribute contained a crafted `filePath` with `<script>` or `"onload=`, it could inject HTML into the tooltip. In practice, the `data-oid` is injected at build time by `injectDataOid()` from parsed file paths that come from the developer's own source tree, making this very low risk. However, the inconsistency with the widget's `escapeHtml` usage is a correctness gap.  
- **Fix**: Apply the same `escapeHtml` pattern used in the widget, or use `textContent`-based construction.

**W2: Tooltip element is appended to `document.body` outside Shadow DOM**  
- **File**: `vite-plugin.ts:399`  
- **Detail**: The tooltip is created as a plain `<div>` on `document.body`, while the issue spec says "Tooltip lives in the Shadow DOM alongside the widget (same host, or a second host)". The widget itself lives in a Shadow DOM (`vite-plugin.ts:69-70`). The tooltip is a separate DOM node at `z-index:999998`.  
- **Risk**: The tooltip could be affected by host page CSS (e.g., global styles that reset `div` elements, or `!important` rules). The inline `style.cssText` mitigates this partially but is not as robust as Shadow DOM encapsulation. The `pointer-events:none` also helps avoid style-related interaction issues.  
- **Fix**: Consider creating the tooltip inside a second Shadow DOM host (matching the spec), or at minimum document the tradeoff.

**W3: `isAltDown` state can become stale if Alt keyup fires while the page is not focused**  
- **File**: `vite-plugin.ts:385-392`  
- **Detail**: The `isAltDown` flag is set on `keydown` and cleared on `keyup`. If the user presses Alt, switches tabs (Alt+Tab), the `keyup` event for Alt may not fire on this page, leaving `isAltDown = true` persistently. This means the next `mouseover` would show the tooltip without Alt actually being held.  
- **Fix**: Add a `blur` listener on `window` that resets `isAltDown = false` and calls `hideHoverTooltip()`.

### Nitpick

**N1: Tooltip does not account for viewport boundary overflow**  
- **File**: `vite-plugin.ts:410`  
- **Detail**: Position is hardcoded to `(x + 12, y + 12)`. If the cursor is near the right or bottom edge, the tooltip may overflow off-screen and become partially invisible.  
- **Suggestion**: Add a bounds check: if `x + 12 + tooltipWidth > window.innerWidth`, flip to `x - tooltipWidth - 4`. Similar for vertical.

**N2: No automated test coverage for hover tooltip**  
- The issue itself notes "No automated test seam (browser DOM code). Manual test only." The `vite-plugin.spec.ts` tests only verify the client script *contains* `handleAltClick` and `createWidget` (line 64-65). There is no assertion that the generated script contains `showHoverTooltip`, `hideHoverTooltip`, or `isAltDown`.  
- **Suggestion**: Add a unit test that `load("\0virtual:pi-design-client")` contains `showHoverTooltip` and `isAltDown` strings (similar to the existing pattern of checking for `handleAltClick` and `createWidget`).

**N3: `mousemove` handler does not update tooltip content on element change**  
- **File**: `vite-plugin.ts:423-427`  
- **Detail**: When moving from one `[data-oid]` element to another while holding Alt, the `mousemove` handler only repositions the tooltip but does not update its content. The `mouseover` handler (line 419) would update content, but `mouseover` only fires when entering a new element — when moving quickly between nested/nested data-oid elements, `mouseover` may not fire reliably if theAlt key was already down before entering. The `mouseout` handler (with the `relatedTarget` check) should cause a hide+reshow flow in most cases.  
- **Impact**: Very minor edge case; unlikely in practice.

---

## 3. Test Results

**Unable to run tests** — the `bash` tool is non-functional in this environment (persistent `Cannot read properties of null (reading 'fg')` error on all shell invocations). Tests could not be executed.

The existing test suite (`packages/react-plugin/tests/vite-plugin.spec.ts`) does not contain any hover-tooltip-specific assertions. The `load` test (line 57-65) checks that the generated client script contains `handleAltClick` and `createWidget` but does not check for `showHoverTooltip` or hover-related code.

---

## 4. Overall Verdict

**Merge-ready with minor recommendations.**

The implementation is solid and meets all five acceptance criteria. The hover tooltip correctly:
- Shows on Alt+hover with tag + file:line info
- Follows the cursor
- Hides on Alt release or mouseout
- Only appears when design mode is connected
- Does not interfere with normal events (pointer-events:none)

The three **warnings** (W1: innerHTML without escaping, W2: outside Shadow DOM, W3: stale isAltDown) are real but low-severity issues. None block merge:
- W1 is low risk because data-oid is build-time generated, but the inconsistency with the widget's `escapeHtml` pattern should be fixed for correctness.
- W2 deviates from the issue spec but is pragmatically fine for an initial implementation.
- W3 is a minor UX bug that can happen with Alt+Tab and is easy to fix with a blur listener.

**Recommended before merge**: Fix W1 (add `escapeHtml` to tooltip innerHTML). W2 and W3 can be follow-ups.
