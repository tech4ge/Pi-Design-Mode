Status: ready-for-agent
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Browser-side toggle shortcut — a keyboard shortcut in the browser that toggles design mode on/off without requiring the user to switch to Pi's terminal and type `/design`.

### Interface

- `Alt+D` keyboard shortcut in the browser
- When no WS connection exists: sends `design:connect` to the server, creates widget
- When WS connection + widget exist: sends `design:disconnect`, destroys widget
- The shortcut only fires in the browser, but the server must handle the `design:toggle` message
- New WS message type: `design:toggle` — server treats it as connect-if-disconnected, disconnect-if-connected

### Behaviours to test

**Server-side (testable):**

1. `design:toggle` when no client tracking exists → same as `design:connect`
2. `design:toggle` when client tracking exists → same as `design:disconnect`

**Browser-side (manual):**

3. Press Alt+D with no connection → widget appears, connects
4. Press Alt+D again → widget disappears, disconnects
5. Alt+D does not fire when typing in the widget input field

### Key files

- `packages/react-plugin/src/vite-plugin.ts` — add `Alt+D` keydown handler in client script
- `packages/extension/src/server.ts` — handle `design:toggle` in message handler
- `packages/extension/src/index.ts` — route `design:toggle` through extension

## Acceptance criteria

- [ ] `design:toggle` WS message handled by server (2 tests)
- [ ] Alt+D toggles design mode in the browser
- [ ] Alt+D ignored when typing in widget input
- [ ] Works as both entry and exit without touching Pi terminal
