Status: done
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Add preset quick-action buttons to the widget for common design changes. One click submits a standard instruction — saves typing for the 80% case.

### Changes

1. **Quick action row**: Add a row of small pill-shaped buttons below the textarea: "Center", "Full width", "Equal spacing", "Same size". Only visible when ≥1 elements are selected.

2. **One-click submit**: Clicking a quick action fills the instruction and immediately submits. No typing needed.

3. **Context-aware**: Some actions only make sense with multiple elements — "Equal spacing" and "Same size" only show when ≥2 elements selected.

### Interface

**HTML**: Quick action row between textarea and processing indicator.
```html
<div class="quick-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
  <button class="qa-btn">Center</button>
  <button class="qa-btn">Full width</button>
  <button class="qa-btn">Equal spacing</button>
  <button class="qa-btn">Same size</button>
</div>
```

**CSS**: Pill buttons, subtle hover, compact.

**JS**: Each button sets the instruction text and clicks submit.

### Behaviours to test

1. Quick actions visible only when selections > 0
2. "Equal spacing" and "Same size" hidden when < 2 selections
3. Clicking quick action submits immediately
4. Works alongside manual textarea input

### Key files

- `packages/react-plugin/src/vite-plugin.ts` — HTML, CSS, JS in client script

## Acceptance criteria

- [ ] Quick action buttons visible when elements selected
- [ ] "Equal spacing" and "Same size" only show with ≥2 selections
- [ ] Clicking a quick action submits the instruction immediately
- [ ] Manual textarea input still works
