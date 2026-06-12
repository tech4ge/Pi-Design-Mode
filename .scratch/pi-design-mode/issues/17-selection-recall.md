Status: done
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Keyboard shortcut to re-select the last set of elements. Speeds up the iterate-tweak cycle where the user keeps working on the same elements.

### Changes

1. **Alt+R shortcut**: When design mode is active and no selections, pressing Alt+R restores the previous selection set (elements + their data-oids). If some elements no longer exist (HMR removed them), silently skip.

2. **Selection stash**: Before clearing selections on submit, save a copy to `lastSelections` variable. On Alt+R, re-populate `selections` from stash and re-apply highlights.

3. **Visual feedback**: Brief flash/pulse on restored elements so user sees what was re-selected.

### Interface

**JS**: 
- `lastSelections` variable populated on submit
- `document.addEventListener("keydown", ...)` for Alt+R
- Re-apply highlights using `addSelection` per element (some may no longer exist in DOM)

### Behaviours to test

1. Alt+R restores previous selection after processing completes
2. If elements removed by HMR, no error — skipped silently
3. If no previous selection exists, no-op
4. Highlights re-applied with correct colors
5. Works after multiple submit cycles (always recalls the most recent)

### Key files

- `packages/react-plugin/src/vite-plugin.ts` — client script JS

## Acceptance criteria

- [ ] Alt+R restores last set of selected elements
- [ ] Missing elements (removed by HMR) skipped silently
- [ ] Highlights re-applied with color-coded outlines
- [ ] No-op if no previous selection exists
