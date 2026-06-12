Status: ready-for-agent
Category: enhancement

# PRD: Decompose Browser Client God File

## Problem Statement

`browser-client.ts` is a 773-line god file. All state lives in a single closure scope (~8 mutable variables: `selections`, `ws`, `isAltDown`, `isProcessing`, `isConnected`, `lastSelections`, `submittedOids`, `widgetHost`). Every function sees every variable. The `createWidget()` function alone is 200+ lines of CSS + HTML + event wiring. There are zero behavioral tests for 773 lines of runtime code. Applying the deletion test: if you delete this file, all complexity reappears elsewhere because it has no internal seams.

## Solution

Extract logical groups into modules that export factory functions, composed by a thin orchestrator IIFE. Each sub-module closes over only the state it owns. The orchestrator wires sub-modules together through explicit parameters — not shared closure variables. The built output (`dist/browser-client.js`) remains a single IIFE — tsup inlines all factory calls.

## User Stories

1. As a maintainer, I want selection logic isolated from widget rendering so that I can change the widget CSS without touching selection persistence
2. As a maintainer, I want reconnection logic isolated from the widget so that I can change the backoff strategy without touching the Shadow DOM
3. As a maintainer, I want hover-tooltip logic in its own module so that I can test it with a simple DOM fixture
4. As a maintainer, I want history logic in its own module so that I can unit-test localStorage interactions without a full browser client
5. As a maintainer, I want Alt+Click handling isolated from the widget so that I can change click selection without touching the rendering pipeline
6. As a maintainer, I want each sub-module to own its state so that bugs in one area don't corrupt another's state
7. As a maintainer, I want the top-level orchestrator to be <100 lines so that the data flow between sub-modules is visible at a glance
8. As a developer, I want DOM fixture tests for selection management so that I can verify highlight/persistence/restore without manually clicking
9. As a developer, I want DOM fixture tests for the hover tooltip so that I can verify positioning without manual mouse tracking
10. As a developer, I want DOM fixture tests for history so that I can verify localStorage round-trips without the full widget

## Implementation Decisions

- **Module structure**: Extract these sub-modules from `browser-client.ts`:
  - `browser-client/connection.ts` — WS connect, reconnect, disconnect, `sendMessage` factory. Owns `ws`, `isConnected`.
  - `browser-client/selection.ts` — add, remove, clear, highlight, persist, restore. Owns `selections`, `lastSelections`, `submittedOids`. Calls back to `sendMessage` (injected).
  - `browser-client/widget.ts` — Shadow DOM creation, render, destroy. Owns `widgetHost`, DOM element references. Calls back to `sendMessage`, `selection` methods (injected).
  - `browser-client/history.ts` — get, save, show, clear. Owns nothing — pure localStorage facade.
  - `browser-client/hover-tooltip.ts` — show, hide, mousemove tracking. Owns `hoverTooltip` element reference.
  - `browser-client/click-handler.ts` — Alt+Click, structural context. Owns nothing — calls `selection.addSelection()` (injected).

- **Orchestrator pattern**: The top-level IIFE creates each sub-module by calling its factory function, passing dependencies explicitly. Example:
  ```
  const conn = createConnection({ onConnect, onDisconnect, onMessage });
  const sel = createSelection({ sendMessage: conn.sendMessage });
  const widget = createWidget({ sendMessage: conn.sendMessage, selection: sel });
  ```

- **Build output unchanged**: `dist/browser-client.js` remains a single IIFE. tsup inlines all the factory calls. The `@pi-design/react-plugin/browser-client` export path is unchanged. `vite-plugin.ts` reads the built file, `next.tsx` imports it — both zero-change.

- **State ownership**: Each module owns its state via closure. No shared mutable scope. The orchestrator only holds a reference to each sub-module's API object.

- **Dependency direction**: All arrows point toward the orchestrator. Sub-modules never import each other. They receive dependencies as factory parameters.

## Testing Decisions

- **Good test**: test each sub-module's public API through jsdom fixture. No mocking of internal functions. DOM interactions via `fireEvent`.
- **Selection module**: test addSelection, removeSelection, clearAllSelections, persistSelections, restoreSelections. Fixture: jsdom with elements having `data-oid` attributes. Assert highlight styles applied, sessionStorage updated.
- **History module**: test getHistory, saveHistory. Fixture: jsdom with localStorage mock. Assert round-trip, max 20, dedup.
- **Hover tooltip module**: test show, hide, positioning. Fixture: jsdom with a tooltip element. Assert style.left/top set correctly.
- **Widget module**: test createWidget renders Shadow DOM, render() updates selection list, destroyWidget cleans up. Fixture: jsdom. This is harder — widget creation involves 250+ lines of CSS/HTML. Start with smoke tests (element exists, widget ID present).
- **Integration**: existing `browser-client.spec.ts` validates the built IIFE contains key functions and no Node imports. This catches assembly regressions.
- **Click handler**: test Alt+Click selects element, normal click is ignored. Fixture: jsdom with `data-oid` elements, dispatch `MouseEvent` with `altKey: true`.

## Out of Scope

- Any changes to the WS server or extension code
- Changes to the `data-oid.ts` module structure (covered by the architectural cleanup PRD)
- Adding new features (multi-select shortcuts, drag-to-select, etc.)
- Changing the widget's visual design or CSS
- Switching from Shadow DOM to a different rendering approach
- Moving the browser-client to a separate npm package

## Further Notes

This PRD depends on the architectural cleanup PRD being completed first, specifically the data-oid split. After the split, the browser client already imports from `data-oid/shared` instead of inlining `parseDataOid` — one fewer function to extract, and the browser-safe import pattern is established.

The decomposition should be done incrementally: extract one module at a time, verify the built IIFE still passes `browser-client.spec.ts` after each extraction, then proceed to the next. This avoids a big-bang refactor of 773 lines.
