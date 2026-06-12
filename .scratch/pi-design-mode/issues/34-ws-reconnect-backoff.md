Status: ready-for-agent
Category: enhancement

## Parent

prd-architectural-cleanup.md

## What to build

Replace the fixed 2-second infinite reconnection loop in `browser-client.ts` with an exponential backoff policy that eventually gives up:

1. Extract a pure `reconnectPolicy` function: `reconnectPolicy(attempt: number) → { delay: number } | { giveUp: true }`. Policy: 2s→4s→8s→16s (cap 30s for attempt 4+), max 10 attempts.
2. Modify `connectWS` to use `reconnectPolicy` instead of hardcoded `setTimeout(connectWS, 2000)`. Track attempt count. On `giveUp`, show "Disconnected — run /design to restart" in the widget error banner and stop retrying.
3. Reset attempt counter on successful connection (`ws.onopen`).
4. Add unit tests for `reconnectPolicy` in a new `reconnect-policy.spec.ts`.

The IIFE build should remain self-contained — `reconnectPolicy` is a pure function with no dependencies.

## Acceptance criteria

- [ ] `reconnectPolicy(0)` returns `{ delay: 2000 }`
- [ ] `reconnectPolicy(1)` returns `{ delay: 4000 }`
- [ ] `reconnectPolicy(3)` returns `{ delay: 16000 }`
- [ ] `reconnectPolicy(4)` returns `{ delay: 30000 }` (cap)
- [ ] `reconnectPolicy(10)` returns `{ giveUp: true }`
- [ ] On give-up, widget shows "Disconnected — run /design to restart" error message
- [ ] Attempt counter resets on successful WS connection
- [ ] All existing tests pass
- [ ] New `reconnect-policy.spec.ts` covers all policy branches

## Blocked by

None — can start immediately
