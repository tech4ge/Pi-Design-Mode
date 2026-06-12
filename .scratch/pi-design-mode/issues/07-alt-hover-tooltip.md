Status: done
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Alt+hover tooltip — when the user holds Alt and hovers over an element, show a lightweight tooltip near the cursor displaying the element's component name, file path, and line number *before* they commit to a selection (Alt+Click).

This helps users identify elements in dense UIs where it's unclear which component they're hovering over.

### Interface

- `mouseenter` handler (with Alt key check) on `document` that finds the closest `[data-oid]` element
- Inject a floating tooltip `<div>` positioned near the cursor showing: component tag, file:line
- `mousemove` handler repositions the tooltip
- `mouseleave` or releasing Alt hides the tooltip
- Tooltip lives in the Shadow DOM alongside the widget (same host, or a second host)
- Only active when design mode is connected (widget exists)

### Behaviours to test

No automated test seam (browser DOM code). Manual test only.

1. Alt+hover over an element → tooltip appears showing tag name + file:line
2. Move mouse while holding Alt → tooltip follows cursor
3. Release Alt → tooltip disappears
4. Leave element boundary → tooltip disappears
5. Without Alt → no tooltip
6. Without design mode connected → no tooltip

### Out of scope

- Showing props or computed styles in the tooltip (too noisy for hover)
- Clicking from the tooltip (use Alt+Click as normal)

## Acceptance criteria

- [ ] Alt+hover shows tooltip with component tag + file:line parsed from `data-oid`
- [ ] Tooltip follows cursor on mousemove
- [ ] Releasing Alt or leaving element hides tooltip
- [ ] No tooltip when design mode is not connected
- [ ] No interference with normal hover/click events
