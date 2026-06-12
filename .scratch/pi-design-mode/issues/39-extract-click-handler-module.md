Status: ready-for-agent
Category: enhancement

## Parent

prd-decompose-browser-client.md

## What to build

Extract the Alt+Click handler from `browser-client.ts` into a `browser-client/click-handler.ts` module:

- `handleAltClick(e: MouseEvent)` — checks Alt key, finds `data-oid`/`data-source` target, builds selection data, calls `selection.addSelection()`, sends `design:select` via `sendMessage`
- Guard: ignores clicks inside the widget host element
- Builds selection data: `dataOid`, `selector`, `computedStyles`, `boundingBox`, `tagName`, `textContent`

The factory function `createClickHandler({ selection, sendMessage, widgetHost })` takes the selection API, sendMessage, and widget host reference (injected).

Add `click-handler.spec.ts` with jsdom fixture: test Alt+Click selects element, normal click ignored, click inside widget ignored, `data-source` fallback.

## Acceptance criteria

- [ ] `browser-client/click-handler.ts` exists with `createClickHandler` factory
- [ ] `handleAltClick` and click event registration extracted
- [ ] `browser-client.ts` uses `createClickHandler` instead of inline definitions
- [ ] `click-handler.spec.ts` covers Alt+Click, normal click ignored, widget guard
- [ ] All existing tests pass

## Blocked by

#38 (selection module — click handler depends on selection API)
