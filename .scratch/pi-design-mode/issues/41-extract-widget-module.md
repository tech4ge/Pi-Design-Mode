Status: ready-for-agent
Category: enhancement

## Parent

prd-decompose-browser-client.md

## What to build

Extract the Shadow DOM widget from `browser-client.ts` into a `browser-client/widget.ts` module:

- `createWidget(sendMessage)` — creates Shadow DOM, injects CSS (~100 lines), builds HTML structure (~50 lines), wires event listeners (~80 lines), exposes `__piDesignWidget` API
- `render()` — updates selection list, connection dot, button states
- `destroyWidget()` — cleanup timers, observers, DOM elements
- `flashEditedElements()` — post-edit green flash animation
- `showSuccess / showError` — feedback UI
- `setProcessing(value)` — processing state UI
- `updateConnection(connected)` — connection dot + form state
- Server-triggered highlight: `highlightElement(dataOid)`

The factory function `createWidget({ sendMessage, selection })` takes `sendMessage` and the selection API (injected).

This is the largest extraction (~300 lines of CSS + HTML + event wiring). Move it last so all other modules are already extracted and the orchestrator can wire them together.

Add `widget.spec.ts` with jsdom fixture: smoke test — widget element created, Shadow DOM present, selection list updates, submit button disabled when no selections.

## Acceptance criteria

- [ ] `browser-client/widget.ts` exists with `createWidget` factory
- [ ] All widget functions extracted from main file
- [ ] `browser-client.ts` uses `createWidget` instead of inline definitions
- [ ] `widget.spec.ts` covers creation, render, destroy smoke tests
- [ ] All existing tests pass

## Blocked by

#36, #37, #38, #39, #40 (all other modules extracted first — this is the last extraction)
