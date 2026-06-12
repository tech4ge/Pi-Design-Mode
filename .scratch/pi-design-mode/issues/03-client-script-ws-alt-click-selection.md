Status: done

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

The client-side script that runs in the browser: WS connection to Pi + Alt+Click element selection. This is vanilla JS, injected as a virtual module by the SWC/Vite plugin (from Slice 1).

**WS Connection + Lifecycle:**
- On page load, attempt to connect to `ws://localhost:9481` (or whatever port the plugin was configured with)
- If connection fails (Pi not running), fail silently — the app works normally
- On successful connect, send `design:connect` with `{ url: window.location.href, title: document.title }`
- Auto-reconnect with exponential backoff if the connection drops
- On page unload, send `design:disconnect`
- If Pi sends `design:mode:off`, close the connection and remove the widget

**Alt+Click Selection:**
- Listen for click events with Alt key held
- Find the target element (or closest ancestor with a `data-oid` attribute)
- Extract: `dataOid`, computed styles via `getComputedStyle()`, bounding box via `getBoundingClientRect()`, `tagName`, `textContent` (truncated)
- Send `design:select` message to Pi over WS
- Draw a highlight outline on the element (e.g. 2px solid blue outline with `!important`)
- Normal clicks without Alt pass through completely — no interception

**The client script does NOT yet include the widget** — that comes in the next slice. For now, selected elements are just highlighted and data is sent to Pi (where it's logged or shown in the widget from Slice 2).

## Acceptance criteria

- [ ] Client script connects to Pi's WS server on page load
- [ ] If Pi is not running, the app works normally with no errors
- [ ] Alt+Clicking an element extracts its `data-oid` and element info
- [ ] `design:select` message is sent to Pi with dataOid, selector, computedStyles, boundingBox, tagName, textContent
- [ ] The clicked element gets a visible highlight outline
- [ ] Normal clicks, scrolls, and interactions are completely unaffected
- [ ] If the WS connection drops, the client auto-reconnects
- [ ] Navigating away from the page sends `design:disconnect`
- [ ] Tests: WS protocol contract — mock server verifies message shapes match the spec

## Blocked by

- 01-data-oid-injection-swc (needs `data-oid` attributes in the DOM)
- 02-extension-design-command-ws-server (needs WS server to connect to)
