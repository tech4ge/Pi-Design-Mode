Status: ready-for-agent
Category: enhancement

## Parent

prd-decompose-browser-client.md

## What to build

Extract the history logic from `browser-client.ts` into a `browser-client/history.ts` module:

- `getHistory(): string[]` — reads from localStorage
- `saveHistory(instruction: string)` — dedup, cap 20, writes to localStorage
- `showHistory()` — renders history items into the widget dropdown

The factory function `createHistory({ shadow, input, historyDropdown })` takes DOM element references (injected by the orchestrator) and returns the history API object.

Add `history.spec.ts` with jsdom fixture: test `getHistory`/`saveHistory` round-trips, cap at 20, dedup, and that `showHistory` populates the dropdown element.

After extraction, `browser-client.ts` should call `createHistory(...)` instead of defining these functions inline. The built IIFE (`dist/browser-client.js`) must still pass all existing `browser-client.spec.ts` tests.

## Acceptance criteria

- [ ] `browser-client/history.ts` exists with `createHistory` factory
- [ ] `getHistory`, `saveHistory`, `showHistory` extracted from main file
- [ ] `browser-client.ts` uses `createHistory` instead of inline definitions
- [ ] `history.spec.ts` covers get/save round-trip, cap at 20, dedup
- [ ] All existing tests pass (build + browser-client.spec.ts)
- [ ] Built `dist/browser-client.js` is still a single IIFE — no changes to consumers

## Blocked by

#33 (data-oid split — establishes browser-safe import pattern)
