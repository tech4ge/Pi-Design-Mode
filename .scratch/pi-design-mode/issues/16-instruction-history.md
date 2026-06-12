Status: done
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Remember recent instructions in a dropdown/list so users can quickly re-submit common patterns without retyping.

### Changes

1. **Store history**: After each submit, push the instruction text to a history array (max 20). Persist in `localStorage` under key `pi-design-history`.

2. **Dropdown on textarea focus**: When textarea is focused and empty (or user presses ↓ arrow), show a dropdown of recent instructions. Clicking one fills the textarea but does NOT auto-submit — user can edit first.

3. **Clear history**: Small "✕" button or "Clear history" option at the bottom of the dropdown.

### Interface

**HTML**: Dropdown `<div>` positioned below the `.input-row`, absolutely positioned.
```html
<div class="history-dropdown" style="display:none;">
  <!-- Populated by JS -->
</div>
```

**CSS**: Matches widget theme, max-height 160px, scrollable, z-index above other widget content.

**JS**: 
- `localStorage.getItem("pi-design-history")` → parse
- On submit: push instruction, save to localStorage
- On focus/arrow: show dropdown
- On click: fill textarea, hide dropdown

### Behaviours to test

1. Instructions saved after submit
2. History persists across page reloads (localStorage)
3. Dropdown shows on focus when textarea is empty
4. Clicking history item fills textarea
5. History limited to 20 items
6. Clear history button works

### Key files

- `packages/react-plugin/src/vite-plugin.ts` — HTML, CSS, JS in client script

## Acceptance criteria

- [ ] Submit saves instruction to localStorage history (max 20)
- [ ] Dropdown appears on textarea focus when empty
- [ ] Clicking history item fills textarea (no auto-submit)
- [ ] History persists across page reloads
- [ ] Clear history option available
