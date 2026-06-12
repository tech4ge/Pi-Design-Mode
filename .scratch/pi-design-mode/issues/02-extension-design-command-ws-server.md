Status: done

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

The Pi extension scaffold that registers the `/design` command and manages a WebSocket server. This lives in `packages/extension/`.

When the user runs `/design`:
1. Start a WebSocket server on a configurable port (default 9481)
2. Show `🔴 Design Mode` in the Pi footer via `ctx.ui.setStatus()`
3. Show a widget above the editor: `🔴 Design Mode | WS: waiting... | Port: 9481` via `ctx.ui.setWidget()`
4. When a WS client connects, update the widget to show `WS: connected`

When the user runs `/design` again (or the session ends):
1. Close the WS server
2. Clear the footer status
3. Clear the widget
4. Send `design:mode:off` to any connected clients

The extension should handle:
- Port conflicts (if 9481 is taken, try 9482, etc., up to a reasonable limit)
- Multiple clients connecting (each gets its own WS connection)
- Clean shutdown on session end

The WS server is the foundation — later slices will add message handlers for `design:select`, `design:submit`, etc. For now, just start the server and accept connections.

## Acceptance criteria

- [ ] `/design` command is registered and appears in Pi's command list
- [ ] Running `/design` starts a WS server and shows footer + widget status
- [ ] A WS client (e.g. `wscat` or browser console) can connect to the server
- [ ] The widget updates to show "connected" when a client connects
- [ ] Running `/design` again stops the server and clears status
- [ ] If the default port is taken, the extension picks the next available port
- [ ] The extension cleans up the WS server on session shutdown

## Blocked by

None — can start immediately.
