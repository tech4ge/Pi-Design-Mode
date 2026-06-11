Status: ready-for-agent
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Alt+drag to lasso multiple elements at once, instead of Alt+Clicking each one individually.

### Changes

1. **Alt+drag detection**: When Alt is held and the user clicks + drags, draw a semi-transparent selection rectangle on a canvas overlay. On release, find all `data-oid` elements whose bounding boxes intersect the rectangle.

2. **Canvas overlay**: Create a full-viewport `<canvas>` on Alt+mousedown (above all content, below the widget). Style: `pointer-events: none` except during Alt+drag. Draw the selection rectangle with a dashed border and semi-transparent fill.

3. **Intersection detection**: On mouseup, query all `[data-oid]` elements, check if `getBoundingClientRect()` intersects the selection rectangle. Add all intersecting elements to selections.

4. **Coexist with Alt+Click**: If Alt+mousedown + mouseup without significant drag (<5px movement), treat as Alt+Click (single element selection). Only enter lasso mode if drag >5px.

### Interface

**JS**:
- Alt+mousedown → create canvas, track start position
- Alt+mousemove → draw selection rectangle
- Alt+mouseup → find intersecting data-oid elements, add to selections, remove canvas
- Movement <5px → fall through to existing Alt+Click handler

### Behaviours to test

1. Alt+drag draws selection rectangle
2. Elements within rectangle are selected
3. Small movements (<5px) treated as Alt+Click
4. Works with existing Alt+Click toggle (deselect on re-click)
5. Canvas cleaned up after drag ends
6. No conflict with normal page interactions (no Alt = normal behavior)

### Key files

- `packages/react-plugin/src/vite-plugin.ts` — canvas overlay, drag detection, intersection logic

## Acceptance criteria

- [ ] Alt+drag draws selection rectangle overlay
- [ ] All data-oid elements within rectangle are selected
- [ ] Movements <5px fall through to Alt+Click
- [ ] Canvas overlay cleaned up after drag
- [ ] No conflict with normal page interactions
