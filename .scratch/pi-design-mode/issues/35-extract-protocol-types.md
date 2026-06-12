Status: ready-for-agent
Category: enhancement

## Parent

prd-architectural-cleanup.md

## What to build

Extract the `ClientMessage` and `ServerMessage` discriminated union types from `extension/src/server.ts` into a new browser-safe shared module:

1. Create `react-plugin/src/protocol.ts` — pure TypeScript interfaces, no Node imports. Define `ClientMessage` and `ServerMessage` discriminated unions with the same shapes currently in `server.ts`.
2. Update `server.ts` — import types from the shared module instead of defining them locally. Re-export for convenience.
3. Update `browser-client.ts` — type the `sendMessage.send()` and `handleServerMessage()` parameters using the protocol types.
4. Add `package.json` export for `./protocol` path.
5. Add compile-time validation: both server build and browser-client build must compile without errors when using the shared types.

The protocol types are erased at runtime — they add zero bytes to the browser-client IIFE. This is purely a compile-time safety net and a documentation seam.

## Acceptance criteria

- [ ] `protocol.ts` exists in `react-plugin/src/` with `ClientMessage` and `ServerMessage` types — no Node imports
- [ ] `server.ts` imports protocol types instead of defining them inline
- [ ] `browser-client.ts` uses protocol types for `sendMessage` and `handleServerMessage`
- [ ] All existing tests pass (types are erased — no behavioral change)
- [ ] `package.json` has `./protocol` export path
- [ ] Both `packages/extension` and `packages/react-plugin` build without errors

## Blocked by

#33 (same browser-safe import pattern; should follow data-oid split as reference)
