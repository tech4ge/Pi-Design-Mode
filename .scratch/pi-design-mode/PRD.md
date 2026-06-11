# Pi Design Mode — PRD

## Problem Statement

Frontend developers working in terminal-based editors (like Pi) cannot visually interact with the UI they're building. To make styling and layout changes, they must mentally map between what they see in the browser and which file/line to edit — a context switch that's slow and error-prone. Cursor's Design Mode solves this for its integrated browser, but no equivalent exists for terminal-native workflows.

## Solution

A Pi extension that lets React developers click elements in their running app, describe changes, and have the LLM edit the source code — with instant preview via HMR. The browser becomes the input surface (element selection + instructions via an overlay widget); Pi's terminal becomes the output surface (LLM reasoning, diffs, file edits).

Build-time `data-oid` attribute injection provides deterministic element-to-source mapping. A WebSocket connects the browser to the Pi extension. Design mode is activated via a `/design` command and uses Alt+Click for element selection so normal browsing is uninterrupted.

## User Stories

### Setup & Activation

1. As a React developer, I want to install a single npm package in my project, so that I can enable design mode with minimal configuration
2. As a React developer, I want to add a single line to my Next.js config, so that the SWC plugin injects source metadata into my app
3. As a React developer, I want to add a single line to my Vite config, so that the Vite plugin injects source metadata into my app
4. As a React developer, I want my app to work identically with or without Pi running, so that the plugin is safe to keep installed at all times
5. As a Pi user, I want to run `/design` to enter design mode, so that I can start selecting elements
6. As a Pi user, I want `/design` to tell me if the dev server isn't running or the plugin isn't installed, so that I know what to fix
7. As a Pi user, I want to exit design mode cleanly, so that the WS connection closes and the browser widget disappears

### Element Selection

8. As a developer, I want to Alt+Click an element in my browser, so that I can select it for editing
9. As a developer, I want normal clicks, scrolls, and interactions to pass through untouched, so that I can navigate my app freely while in design mode
10. As a developer, I want the selected element to be visually highlighted in the browser, so that I can confirm what I've selected
11. As a developer, I want to see element info (component name, file, line, props, styles) in the browser widget, so that I have context before submitting a change
12. As a developer, I want to deselect an element by clicking it again or removing it from the widget, so that I can correct a mistaken selection
13. As a developer, I want selection to work on any React 18+ project with the plugin installed, so that I'm not locked to a specific framework version

### Change Submission

14. As a developer, I want to type an instruction in the browser widget, so that I can describe the change I want
15. As a developer, I want to submit my selection + instruction with a single button press, so that the LLM can process the change
16. As a developer, I want to see a loading state in the widget while the LLM works, so that I know my request is being processed
17. As a developer, I want the Submit button to be disabled while the LLM is processing, so that I don't accidentally submit twice
18. As a developer, I want to see the LLM's reasoning and file edits in Pi's terminal, so that I can verify what changed
19. As a developer, I want the browser to update automatically via HMR after the LLM edits, so that I see the result immediately

### Pi Extension

20. As a Pi user, I want to see a "🔴 Design Mode" status in the Pi footer when design mode is active, so that I always know the extension state
21. As a Pi user, I want to see a widget above the editor showing the current design mode state, so that I have persistent visual context
22. As a Pi user, I want element selection messages to appear in the Pi conversation, so that the LLM and I both see what was selected
23. As a Pi user, I want the `design_inspect` tool to be available to the LLM, so that it can re-inspect or probe deeper into an element
24. As a Pi user, I want `design_inspect` to highlight the target element in the browser, so that I can visually confirm what the LLM is about to edit

### Resilience

25. As a developer, I want design mode to gracefully handle the dev server restarting, so that my session isn't lost
26. As a developer, I want design mode to reconnect if the WS connection drops, so that I don't have to restart the workflow
27. As a developer, I want the browser widget to disappear cleanly when I navigate away from the page, so that it doesn't interfere with other sites
28. As a developer, I want the browser widget to re-appear when I navigate back to my app, so that design mode resumes automatically

## Implementation Decisions

### Architecture

- The extension is a Pi extension installed in `.pi/extensions/` or `~/.pi/agent/extensions/`. It registers the `/design` command, the `design_inspect` tool, and manages a WebSocket server.
- The bundler plugin is an npm package (`@pi-design/react-plugin`) installed in the user's project. It injects `data-oid` attributes via AST transform and embeds the client script as a virtual module.
- The client script + widget is vanilla JS (Shadow DOM, no React dependency), bundled and injected by the bundler plugin. It connects to the Pi extension via WebSocket and renders the design mode overlay.
- The app works identically with or without Pi running. If the WS connection fails silently (Pi not running), the widget doesn't appear and normal browsing continues.

### data-oid Format

- Every JSX element receives a `data-oid` attribute during build: `c:H:r:file:line:column`
  - `c` — component type marker (future: `e` for element, `f` for fragment)
  - `H` — hash of the project root (disambiguates monorepo packages)
  - `file` — relative file path from project root
  - `line` — line number in source file
  - `column` — column number in source file (same-line disambiguation)
- Component name, parent hierarchy, props — all derived on-demand by `design_inspect`, not baked into the attribute.

### WebSocket Protocol

The Pi extension starts a WebSocket server on a configurable port (default: 9481). The client script connects on page load.

**Browser → Pi:**

| Message | Payload |
|---------|---------|
| `design:connect` | `{ url, title }` |
| `design:select` | `{ dataOid, selector, computedStyles, boundingBox, tagName, textContent }` |
| `design:submit` | `{ selections: [...dataOid], instruction: string }` |
| `design:deselect` | `{ dataOid }` |
| `design:disconnect` | — |

**Pi → Browser:**

| Message | Payload |
|---------|---------|
| `design:mode:on` | `{ wsPort }` |
| `design:mode:off` | — |
| `design:highlight` | `{ dataOid }` |
| `design:processing` | — |
| `design:done` | — |

### Element Selection

- Alt+Click activates element selection. Normal clicks, scrolls, and interactions pass through.
- The `data-oid` attribute on the clicked element resolves to the exact source file, line, and column.
- On selection, the client script extracts `getComputedStyle()` and `getBoundingClientRect()` and sends them to Pi over the WS.
- The selection appears in the browser widget as a list item showing component tag name, file, and key props.
- Selection messages also flow to Pi via `pi.sendMessage()` as visible conversation messages.

### Browser Widget

- Rendered in a Shadow DOM container injected by the client script.
- Contains: selected elements list, text input for instructions, Submit button.
- Submit sends `design:submit` to Pi. Pi converts it to a user-facing message in the conversation containing all selected element info + the instruction.
- Disables Submit and shows a processing state while the LLM is working (`design:processing` / `design:done` from Pi).
- Position: fixed, bottom-right corner of the viewport. Draggable is out of scope for MVP.

### design_inspect Tool

- Registered via `pi.registerTool()`. Available to the LLM when design mode is active.
- Parameters: `{ dataOid: string }` or `{ selector: string }`.
- Returns: component name, source file, line, column, key props, computed styles, bounding box, parent component name and file.
- Side effect: sends `design:highlight` to the browser, drawing a temporary outline on the element.
- Implementation: parses the `data-oid` format to get file+line+column, reads the file, uses AST parsing to extract JSX element info at that location.

### Pi Terminal UX

- `/design` command enters design mode, starts WS server, shows footer status and widget.
- Footer: `🔴 Design Mode` via `ctx.ui.setStatus()`.
- Widget above editor: `🔴 Design Mode | WS: connected | Port: 9481` via `ctx.ui.setWidget()`.
- `/design` again exits design mode.
- Element selection messages appear in the Pi conversation as visible text messages.
- Normal Pi input is available for non-design-mode work at all times.

### Bundler Plugin — SWC Adapter (Next.js)

- SWC plugin written in Rust (or WASM via swc-bindgen), registered via `experimental.swcPlugins` in `next.config.js`.
- Walks JSX AST, injects `data-oid` attribute on every JSX element.
- Embeds client script as a virtual module injected into the page during dev mode only.
- Does nothing in production builds.

### Bundler Plugin — Vite Adapter

- Vite plugin using `transform` hook, registered in `vite.config.ts`.
- Uses `@babel/parser` or `@babel/traverse` for AST walking (Vite doesn't use SWC by default).
- Same `data-oid` injection logic as SWC adapter.
- Same client script injection.

### React Version

- Target: React 18+. The `data-oid` attribute injection is a build-time transform — no React runtime features required.

## Testing Decisions

### What makes a good test

- Only test external behaviour, not implementation details.
- Tests should survive internal refactors — if we change how `data-oid` is formatted, only the format tests break, not the transform logic tests.
- Integration-style tests through public interfaces. No mocking collaborators.

### WS Protocol contract (highest-value seam)

- A shared test suite defining the message shapes and sequences.
- Both the client script and the extension import the same type definitions — the tests prove they agree.
- Tests: given a `design:submit` message, the extension produces the correct `pi.sendMessage()` content. Given a `design:select` message, the element info is correctly parsed and routed.

### data-oid injection (transform seam)

- Fixture TSX files go through the SWC and Vite transforms.
- Output is inspected for correct `data-oid` attributes with expected file:line:column values.
- Edge cases: fragments, conditional rendering, dynamic component names, same-line multiple elements.

### design_inspect tool (extension seam)

- Tool is called with a known `data-oid` string.
- Returns structured JSON with component name, file, line, styles, bounding box.
- Tests don't need a real browser — the tool reads files from disk.

### End-to-end (manual smoke test)

- Spin up a Next.js app with the plugin.
- Start Pi with the extension.
- Run `/design`, Alt+Click an element, submit a change.
- Verify the message appears in Pi, the LLM edits the file, HMR refreshes the browser.
- Not automated — manual checklist.

### Out of scope for testing

- Browser widget rendering (visual, hard to automate, manual verification)
- LLM edit quality (depends on model, not our code)
- SWC plugin internals (test through the transform output, not the Rust code)

## Out of Scope

- **Screenshots** — Phase 3. Would require CDP or a headless browser.
- **Multi-element selection** — The widget accumulates selections, but MVP doesn't batch them. Each submit is one element + instruction. Multi-select (select several → "make them consistent") is a future enhancement.
- **AST-aware editing** — Pi's existing `edit` tool is sufficient for design mode changes.
- **Voice input** — Future enhancement.
- **React DevTools fallback** — Not in MVP. `data-oid` is the only element-to-source mapping path.
- **Production builds** — The plugin only runs in dev mode.
- **Non-React frameworks** — Vue, Svelte, Angular are out of scope.
- **Component-aware suggestions** — "This pattern is inconsistent with NavButton" — future.
- **Design mode widget in Pi's TUI** — The widget lives in the browser only. Pi shows footer status and an info widget above the editor.

## Further Notes

- The research report (`research-report.md`) that preceded this PRD provides extensive background on Cursor Design Mode, Onlook's architecture, and the React/Next.js tooling landscape.
- ADRs 0001–0008 in `docs/adr/` record the architectural decisions that shaped this PRD.
- Phase 2 (build-time instrumentation hardening) and Phase 3 (screenshots + visual validation) are described in the research report but are not part of this PRD.
