Status: ready-for-agent
Category: enhancement

## Parent

prd-decompose-browser-client.md

## What to build

Extract the selection management logic from `browser-client.ts` into a `browser-client/selection.ts` module:

- `addSelection(sel, sendMessage)` — toggle add/remove, highlight, persist, render
- `removeSelection(dataOid, sendMessage)` — unhighlight, send deselect, persist, render
- `clearAllSelections(sendMessage)` — unhighlight all, send deselect all, persist, render
- `applyHighlight / clearHighlight / reapplyAllHighlights` — DOM outline management
- `flashElement(dataOid)` — scroll + flash animation
- `persistSelections / restoreSelections / applyRestoredSelections` — sessionStorage round-trip with MutationObserver
- `computeStructuralContext()` — sibling/component grouping
- State: `selections[]`, `lastSelections[]`, `submittedOids[]`

The factory function `createSelection({ sendMessage, onRender })` takes `sendMessage` (injected connection) and `onRender` callback (injected by orchestrator to trigger widget re-render).

Add `selection.spec.ts` with jsdom fixture: test add/remove toggling, highlight styles applied, sessionStorage persistence, restore with MutationObserver.

## Acceptance criteria

- [ ] `browser-client/selection.ts` exists with `createSelection` factory
- [ ] All selection functions extracted from main file
- [ ] `browser-client.ts` uses `createSelection` instead of inline definitions
- [ ] `selection.spec.ts` covers add/remove toggle, highlight, persist/restore
- [ ] All existing tests pass

## Blocked by

#33 (data-oid split — establishes browser-safe import pattern)
