Status: ready-for-agent
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Improve the Pi Design Mode browser widget UX — the current single-line `<input>` and compact fixed size make it awkward to type instructions and review selections.

### Changes

1. **`<input>` → `<textarea>` with auto-grow**: Replace the single-line input with a textarea that grows as the user types (max ~120px, then scrolls). Shift+Enter adds a newline, Enter submits. This is the standard chat UX pattern (Cursor, ChatGPT, etc.).

2. **Expand widget on input focus**: When the textarea is focused, the widget expands from its compact default (min-width 280px) to a larger size (min-width 380px, wider textarea). On blur, it contracts back. Gives room when typing, stays compact otherwise.

3. **Increase selection list max-height**: From 120px to 180px. The list is already scrollable but 120px is very tight with 4+ items.

### Interface

**HTML changes:**
- Replace `<input type="text">` with `<textarea rows="1">`
- Keep submit button in same row (input-row → now contains textarea + button)

**CSS changes:**
- `.widget` default: `min-width: 280px; max-width: 360px;` → `min-width: 300px; max-width: 420px;`
- `.widget.expanded` (applied when textarea focused): `min-width: 380px;`
- `.selections` max-height: `120px` → `180px`
- New textarea styles: `resize: none; overflow-y: auto; max-height: 120px;` with auto-grow via JS
- Transition on widget width change for smooth expand/collapse

**JS changes:**
- `textarea.addEventListener("input", autoGrow)` — sets `textarea.style.height = "auto"` then `textarea.scrollHeight + "px"` (capped at 120px)
- `textarea.addEventListener("keydown", ...)` — Enter submits, Shift+Enter inserts newline
- `textarea.addEventListener("focus", ...)` — add `.expanded` to widget
- `textarea.addEventListener("blur", ...)` — remove `.expanded`

### Behaviours to test

Manual test only (browser DOM code).

1. Click textarea → widget expands wider
2. Click away → widget contracts
3. Type multi-line instruction → textarea grows, max 120px then scrolls
4. Shift+Enter → newline in textarea
5. Enter → submits (same as current)
6. Selection list with 6+ items → scrollable at 180px
7. Submit clears textarea → auto-shrinks back to 1 row

### Key files

- `packages/react-plugin/src/vite-plugin.ts` — widget HTML, CSS, JS in `generateClientScript()`

## Acceptance criteria

- [ ] Textarea replaces input with auto-grow (max 120px)
- [ ] Shift+Enter adds newlines, Enter submits
- [ ] Widget expands on textarea focus, contracts on blur
- [ ] Selection list max-height increased to 180px
- [ ] Smooth width transition on expand/collapse
- [ ] Submit clears textarea and resets to 1 row
