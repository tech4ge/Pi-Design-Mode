Status: done

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

The full LLM processing loop — connecting the submit action to Pi's agent, and the `design_inspect` tool.

**`design_inspect` tool:**
- Registered via `pi.registerTool()`. Only active when design mode is on (use `pi.setActiveTools()`).
- Parameters: `{ dataOid: string }` — the `data-oid` value to inspect.
- Implementation: parse the `data-oid` format to extract file path + line + column. Read the file from disk. Parse the JSX at that location to extract component name, props, parent component. Return structured JSON.
- Side effect: send `design:highlight` to the browser via WS, drawing a temporary outline on the element.
- Prompt snippet and guidelines registered so the LLM knows when and how to use it.

**Submit → LLM processing:**
- When `design:submit` arrives, the extension sends `design:processing` to the browser (so the widget shows loading state).
- The submit message (via `pi.sendMessage()`) is already in the conversation from Slice 4. The LLM should now act on it — reading the file and editing it using Pi's standard `read`/`edit` tools.
- When the LLM finishes the turn (listen for `agent_end` or `turn_end`), send `design:done` to the browser so the widget returns to normal state.
- HMR handles the browser refresh — no action needed from the extension.

**Error handling:**
- If the LLM turn errors, still send `design:done` so the widget unsticks.
- If the WS connection drops during processing, the message is in Pi's conversation regardless — the edit can still complete.

## Acceptance criteria

- [ ] `design_inspect` tool is registered and appears in Pi's available tools during design mode
- [ ] Calling `design_inspect` with a `data-oid` returns component name, file, line, column, key props, computed styles, bounding box
- [ ] `design_inspect` sends `design:highlight` to the browser, highlighting the target element
- [ ] Submitting a change from the widget triggers the LLM to act on the message
- [ ] The LLM reads the relevant file and makes an edit using Pi's `edit` tool
- [ ] After the LLM finishes, `design:done` is sent to the browser
- [ ] The browser updates via HMR after the file edit
- [ ] If the LLM errors, `design:done` is still sent so the widget doesn't stay in processing state
- [ ] The `design_inspect` tool is only active when design mode is on
- [ ] Tests: calling `design_inspect` with a known `data-oid` + fixture file returns correct structured output

## Blocked by

- 04-selection-message-pi-widget-submit (needs submit flow + widget)
