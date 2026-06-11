Status: ready-for-agent
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Broadcast design mode messages to all connected browser tabs, not just one. One `/design` instance serves multiple tabs for apps with multi-tab workflows.

### Changes

1. **Track multiple connections**: `DesignModeServer` currently tracks `ws` as a single connection. Change to `Set<WebSocket>` to track all connected clients.

2. **Broadcast to all**: `server.broadcast()` already sends to all — verify it works with multiple connections.

3. **Per-tab selection state**: Each tab maintains its own selections. `design:select` and `design:submit` include a tab identifier so Pi knows which tab the selections come from.

4. **Highlight sync (optional)**: When one tab selects an element, other tabs don't need to show it — selections are tab-local.

### Interface

**Server change**: `ws` field → `clients: Set<WebSocket>`. `onConnection` pushes to set, `onClose` removes.

**Client addition**: Generate a `tabId` on page load (`crypto.randomUUID()`). Include in all messages.

**Message format addition**:
```typescript
tabId: string; // on all client→server messages
```

### Behaviours to test

1. Open two tabs → `/design` → both show widget
2. Select element in tab A → only tab A highlights
3. Submit in tab A → Pi processes, tab A shows processing
4. Tab B remains interactive (can make its own selections)
5. Server test: multiple connections, broadcast reaches all

### Key files

- `packages/extension/src/server.ts` — multi-client support
- `packages/react-plugin/src/vite-plugin.ts` — tabId generation
- `packages/extension/tests/server.spec.ts` — multi-client test

## Acceptance criteria

- [ ] Server tracks multiple WebSocket connections
- [ ] Each client generates a unique tabId
- [ ] Selections are tab-local (not synced between tabs)
- [ ] Broadcast messages reach all connected tabs
- [ ] Server test for multi-client broadcast
