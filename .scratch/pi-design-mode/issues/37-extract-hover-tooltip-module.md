Status: ready-for-agent
Category: enhancement

## Parent

prd-decompose-browser-client.md

## What to build

Extract the hover tooltip logic from `browser-client.ts` into a `browser-client/hover-tooltip.ts` module:

- `showHoverTooltip(dataOid: string, x: number, y: number)` — creates tooltip element, sets position
- `hideHoverTooltip()` — hides tooltip
- Mouse event wiring: `mouseover`, `mousemove`, `mouseout` handlers that show/hide/position the tooltip on Alt+Hover

The factory function `createHoverTooltip({ isAltDown })` takes the alt-key state reader (injected) and returns the tooltip API + event listeners.

Add `hover-tooltip.spec.ts` with jsdom fixture: test show/hide toggling, positioning (style.left/top), and that the tooltip hides when Alt is released.

## Acceptance criteria

- [ ] `browser-client/hover-tooltip.ts` exists with `createHoverTooltip` factory
- [ ] `showHoverTooltip`, `hideHoverTooltip`, mouse event wiring extracted
- [ ] `browser-client.ts` uses `createHoverTooltip` instead of inline definitions
- [ ] `hover-tooltip.spec.ts` covers show/hide, positioning, Alt-key gating
- [ ] All existing tests pass

## Blocked by

#33 (data-oid split — establishes browser-safe import pattern)
