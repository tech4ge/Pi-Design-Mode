Status: ready-for-agent
Category: enhancement

# PRD: Architectural Cleanup — Browser Client Dedup, Protocol Types, Reconnection

## Problem Statement

The pi-design-mode browser client has accumulated architectural friction: a redundant inline `parseDataOid` copy, a missing `useEffect` guard on the Next.js client component, no shared protocol types between server and client, and an infinite reconnection loop with no backoff. These are not feature gaps but maintainability and correctness issues that slow development and risk silent breakage.

## Solution

Four targeted fixes, each independently shippable:
1. Split `data-oid.ts` so the browser client can import `parseDataOid` without pulling in `node:crypto`
2. Wrap the Next.js dynamic `import()` in `useEffect` so it fires once on mount, not per-render
3. Extract WS protocol types into a browser-safe shared module
4. Add exponential backoff and max attempts to WS reconnection

## User Stories

1. As a maintainer, I want `parseDataOid` defined once so that adding a new OID format requires editing one file, not two
2. As a maintainer, I want the browser client to import browser-safe functions from `data-oid` directly so that I cannot accidentally break the IIFE build by pulling in Node APIs
3. As a developer, I want `PiDesignClient` to import the browser module once on mount so that re-renders don't trigger unnecessary dynamic imports
4. As a developer, I want shared protocol types between server and client so that protocol changes cause compile errors, not silent runtime failures
5. As a user, I want the browser client to stop retrying WS after the design mode server is gone so that I don't have infinite connection failures in the console
6. As a user, I want the browser client to show a clear "Disconnected" message after retries fail so that I know to restart design mode
7. As a maintainer, I want a testable reconnection policy function so that I can verify backoff behavior without spinning up real WS connections

## Implementation Decisions

- **data-oid split**: Create `data-oid/shared.ts` exporting `parseDataOid`, `formatDataOid`, and `DataOidComponents` (browser-safe, no imports). `data-oid/index.ts` re-exports everything from `shared` and adds `hashProjectRoot` (which imports `node:crypto`). The `@pi-design/react-plugin/data-oid` export path continues to point at `data-oid/index.ts` — existing consumers unchanged. The browser-client IIFE build imports from `data-oid/shared` via tsup, which inlines only the browser-safe code.

- **PiDesignClient useEffect**: Wrap the dynamic `import("@pi-design/react-plugin/browser-client")` in `useEffect(() => { ... }, [])`. The `NODE_ENV` guard stays inside the effect. No other changes.

- **Shared protocol types**: Extract `ClientMessage` and `ServerMessage` discriminated union types from `extension/src/server.ts` into a new `react-plugin/src/protocol.ts` (browser-safe, pure TypeScript interfaces). The extension imports these types (tsup inlines them at build). The browser client's `sendMessage.send()` and `handleServerMessage()` get typed.

- **WS reconnection backoff**: Extract reconnection policy as a pure function: `reconnectPolicy(attempt: number) → { delay: number } | { giveUp: true }`. Default: exponential backoff 2s→4s→8s→16s, cap 30s, max 10 attempts. On give-up, show "Disconnected — run /design to restart" in the widget, stop retry. The `connectWS` function uses this policy instead of a hardcoded `setTimeout(connectWS, 2000)`.

## Testing Decisions

- **Good test**: tests external behavior through the module's public interface, not implementation details. Pure functions are preferable.
- **data-oid/shared**: unit tests for `parseDataOid` (all 3 OID formats + null cases) and `formatDataOid` (round-trip). Already partially covered by `transform.spec.ts` — new tests go in a `data-oid.spec.ts` focused on the shared module.
- **PiDesignClient**: manual verification sufficient — it's a 1-line change. Automated: render the component, mock the dynamic import, assert it's called once.
- **protocol types**: compile-time verification. No runtime tests needed — TypeScript ensures both sides use the same shapes. Existing `server.spec.ts` continues to validate message shapes end-to-end.
- **reconnection policy**: unit test the pure `reconnectPolicy` function: attempt 0 → 2s, attempt 1 → 4s, attempt 4 → 16s, attempt 5+ → cap 30s, attempt 10 → giveUp. Integration: `browser-client.spec.ts` validates the built IIFE doesn't spin up real connections.
- **Browser-client build**: existing `browser-client.spec.ts` validates no `node:crypto` or `require()` in the IIFE output. This catches regressions from the data-oid split.

## Out of Scope

- Decomposing the browser-client god file into sub-modules (separate PRD)
- Adding new message types to the WS protocol
- Changing the WS connection URL or port discovery mechanism
- Any changes to the Vite plugin transform pipeline or Babel transform
- Adding jsdom-based DOM fixture tests for browser-client internals

## Further Notes

The recommended implementation order is: PiDesignClient fix → data-oid split → reconnection backoff → protocol types. Each is independently shippable and the data-oid split sets up the browser-safe sub-module pattern that the protocol types extraction follows.
