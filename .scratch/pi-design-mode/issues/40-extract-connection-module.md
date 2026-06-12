Status: ready-for-agent
Category: enhancement

## Parent

prd-decompose-browser-client.md

## What to build

Extract the WS connection logic from `browser-client.ts` into a `browser-client/connection.ts` module:

- `connectWS(sendMessage)` — create WebSocket, handle open/close/error/message
- `disconnect(sendMessage)` — send disconnect message, close WebSocket, cleanup
- `handleServerMessage(message, sendMessage)` — route server messages (design:mode:off, design:highlight, design:processing, design:done, design:error)
- `sendMessage` factory — creates the `{ send(), isConnected() }` object
- State: `ws`, `isConnected`
- Reconnection: uses `reconnectPolicy` from #34 (if done) or falls back to fixed 2s

The factory function `createConnection({ onConnect, onMessage, onDisconnect })` takes callbacks (injected) and returns the connection API including `sendMessage`.

Add `connection.spec.ts`: test `sendMessage.send()` formats JSON, `isConnected()` reflects state, `handleServerMessage` routes correctly.

## Acceptance criteria

- [ ] `browser-client/connection.ts` exists with `createConnection` factory
- [ ] `connectWS`, `disconnect`, `handleServerMessage`, `sendMessage` extracted
- [ ] `browser-client.ts` uses `createConnection` instead of inline definitions
- [ ] `connection.spec.ts` covers `sendMessage`, `handleServerMessage` routing
- [ ] All existing tests pass

## Blocked by

#33 (data-oid split — establishes browser-safe import pattern)
