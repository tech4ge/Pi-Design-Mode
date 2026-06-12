Status: ready-for-agent
Category: enhancement

## Parent

prd-decompose-browser-client.md

## What to build

After all sub-modules are extracted, verify and slim down the orchestrator in `browser-client.ts`. The top-level IIFE should now be a thin composition layer:

1. Create each sub-module by calling its factory function
2. Wire dependencies (pass `sendMessage` to selection, pass selection to widget, etc.)
3. Register global event listeners (keyboard for Alt/Esc, beforeunload)
4. Initiate the WS connection

The orchestrator should be under 100 lines. No business logic — only wiring.

Verify: all `browser-client.spec.ts` tests pass. The built IIFE is unchanged from consumer perspective.

## Acceptance criteria

- [ ] `browser-client.ts` top-level IIFE is <100 lines
- [ ] No business logic in the orchestrator — only factory calls + wiring
- [ ] All existing tests pass
- [ ] Built `dist/browser-client.js` is still a single IIFE with same external behavior

## Blocked by

#41 (widget module — last extraction)
