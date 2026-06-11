Status: ready-for-agent
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Show error states in the widget when things go wrong (WS disconnect, inspect failure, Pi errors) instead of silently hanging or showing stale "Processing..." forever.

### Changes

1. **Connection status indicator**: Widget already has a dot (green = connected, red = disconnected). Add a tooltip: "Connected to Pi" / "Disconnected — changes won't be sent".

2. **Error banner**: When an error occurs, show a red-tinted banner at the top of the widget: "⚠️ [error message]". Auto-dismiss after 10s, or dismiss on click. Examples:
   - "Connection lost — will retry"
   - "Inspect failed — element not found in source"
   - "Pi encountered an error"

3. **Processing timeout**: If `design:processing` has been active for >60s with no `design:done`, show "Still processing... Click to cancel" with a cancel button that sends `design:deselect` with `__all__` and clears processing state.

4. **Extension error forwarding**: If Pi's agent encounters an error during a design turn, catch it and send a `design:error` message to the browser with a summary.

### Interface

**New WS message (Pi→Browser):**
```typescript
{ type: "design:error", message: string }
```

**Widget HTML addition:**
```html
<div class="error-banner" style="display:none;">⚠️ <span class="error-msg"></span></div>
```

**CSS**: Red-tinted bg (`#45475a` with `#f38ba8` text), dismissible.

### Behaviours to test

1. WS disconnect → dot turns red, error banner appears
2. WS reconnect → dot turns green, error banner clears
3. Processing >60s → timeout warning with cancel option
4. Pi error → `design:error` → error banner in widget

### Key files

- `packages/react-plugin/src/vite-plugin.ts` — error banner HTML/CSS/JS
- `packages/extension/src/index.ts` — error forwarding
- `packages/extension/src/server.ts` — `design:error` message type

## Acceptance criteria

- [ ] Connection disconnect shows error banner + red dot
- [ ] Reconnect clears error banner + green dot
- [ ] Processing >60s shows timeout warning with cancel
- [ ] Pi errors forwarded as `design:error` to browser
- [ ] Error banners auto-dismiss after 10s
