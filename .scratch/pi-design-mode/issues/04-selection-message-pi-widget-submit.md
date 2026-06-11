Status: ready-for-agent

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Two things that are only meaningful together:

**1. Pi message routing** — when the extension receives `design:submit` over WS, it converts the payload into a visible message in the Pi conversation via `pi.sendMessage()`. The message includes the selected element info + the user's instruction. The LLM must be able to see this message and use it as context for editing.

Format of the Pi message:
```
🔍 Design Mode

Selected: NavButton at src/components/NavButton.tsx:8
Props: { variant: "primary", href: "/about" }
Styles: { background-color: "rgb(59, 130, 246)", padding: "8px 16px" }

Instruction: "make it blue"
```

Also: when `design:select` comes in (not just submit), route a lighter message to Pi showing the selection — so the LLM and user both see what was clicked even before submit.

**2. Browser widget** — the Shadow DOM overlay that renders in the bottom-right corner of the viewport. It contains:
- A list of selected elements (tag name, file, line — extracted from the `data-oid`)
- A text input for the user's instruction
- A Submit button

When the user submits:
1. Widget sends `design:submit` with `{ selections: [...dataOid], instruction: string }` over WS
2. Widget shows a "Processing..." state and disables Submit
3. When Pi sends `design:done`, widget returns to normal state

When the user deselects (clicks the x on a list item, or Alt+Clicks an already-selected element):
- Widget sends `design:deselect` with `{ dataOid }`
- Element is removed from the list

The widget is vanilla JS + Shadow DOM (no React). Use inline CSS within the shadow root. Design should be minimal and unobtrusive — small, fixed position, doesn't block the main content area.

## Acceptance criteria

- [ ] Alt+Clicking an element causes a selection message to appear in Pi's conversation
- [ ] The browser widget appears when a WS connection is active and an element is selected
- [ ] The widget shows selected element info (tag, file, line)
- [ ] The user can type an instruction in the widget's text input
- [ ] Clicking Submit sends `design:submit` to Pi and a message appears in Pi's conversation
- [ ] The widget shows "Processing..." and disables Submit after submission
- [ ] When Pi sends `design:done`, the widget returns to normal state
- [ ] The user can remove a selected element from the widget list (deselect)
- [ ] The widget does not interfere with the app's layout (Shadow DOM isolation)
- [ ] The widget is positioned bottom-right, doesn't block main content

## Blocked by

- 03-client-script-ws-alt-click-selection (needs client script + WS connection + selection)
