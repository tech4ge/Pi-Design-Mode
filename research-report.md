# Pi Design Mode — Research Report

> Feasibility study for building a Cursor Design Mode replica as a Pi extension, focused on React/Next.js projects.

**Date:** 2026-06-11

---

## Table of Contents

1. [Context: What is Cursor Design Mode?](#1-context-what-is-cursor-design-mode)
2. [Can We Build This for Pi?](#2-can-we-build-this-for-pi)
3. [The React/Next.js Advantage](#3-the-reactnextjs-advantage)
4. [Rethinking Screenshots](#4-rethinking-screenshots)
5. [Existing Projects & Prior Art](#5-existing-projects--prior-art)
6. [Onlook: The Key Reference Implementation](#6-onlook-the-key-reference-implementation)
7. [Proposed Architecture](#7-proposed-architecture)
8. [Pi Extension Capabilities We'd Use](#8-pi-extension-capabilities-wed-use)
9. [Caveats & Limitations](#9-caveats--limitations)
10. [Recommendations & Next Steps](#10-recommendations--next-steps)

---

## 1. Context: What is Cursor Design Mode?

Cursor Design Mode was introduced in **Cursor 3** (April 2026). It is a visual editing layer for UI interaction within Cursor's integrated browser.

### Core UX
- Activate via **Cmd+Shift+D** in the Agents Window
- **Click, draw, or use voice** to select UI elements in the live application
- Provide instructions (text or voice), and the AI applies changes to **source code** based on visual context
- AI ingests **HTML, CSS, computed styles, and visual context** to make precise edits

### Key Features
- Multi-element selection — target several UI elements at once
- Voice queuing — multitask while giving instructions
- Canvas integration — iterative visual edits
- Successfully harnesses the React component model

### Design Mode vs. Agent Mode

| | Agent Mode | Design Mode |
|---|---|---|
| **Scope** | General coding tasks | Visual UI edits only |
| **Input** | Text prompts | Click/draw/voice on live UI |
| **Best for** | Features, refactoring, bugs | Precise layout/styling changes |

---

## 2. Can We Build This for Pi?

**Yes, with caveats.** The core loop — *see a running UI → select elements → get context → AI edits source code* — can be built as a Pi extension.

The main constraint: **Pi is terminal-native**, so the "integrated browser" part requires a different architecture than Cursor's. Instead of a single window with embedded browser, we'd work with a separate Chrome/browser window connected via the Chrome DevTools Protocol (CDP).

However, this is actually a strength in some ways — the user's real dev server and browser with full DevTools access are the editing surface, not a sandboxed iframe.

---

## 3. The React/Next.js Advantage

Focusing on React/Next.js dramatically simplifies the problem. Instead of poking at raw DOM (fragile and ambiguous), React gives us a **structured component model** we can walk directly.

### React DevTools → Source of Truth

React DevTools already maintain a live mapping from rendered element → component instance → source file. We just need to tap into it.

```
User clicks <button> in browser
       │
       ▼
  DOM element (.site-header-btn)
       │
       ▼  React DevTools protocol
  React component tree
  ┌─ <App>
  │  └─ <Layout>            ← src/app/layout.tsx
  │     └─ <Header>         ← src/components/Header.tsx:14
  │        └─ <NavButton>   ← src/components/NavButton.tsx:8
  │           └─ <button>   ← the clicked element
       │
       ▼  source map + component metadata
  Exact file, line, props, hooks
```

This is **dramatically better** than raw CDP. Instead of "there's a div with class `btn-primary` somewhere", you get "this is `NavButton` at line 8, its `variant` prop is `primary`, and it's rendering inside `Header`".

### Leveraging the Next.js Ecosystem

| Tool/Protocol | What it gives us |
|---|---|
| **React DevTools standalone** | Connects via CDP. Full fiber tree, component names, props, state, hooks — not just DOM |
| **`react-devtools-inline`** | Embeddable version. Could inject into a panel in our CDP session |
| **Next.js Fast Refresh** | Already built-in HMR. Edits appear instantly — no custom refresh logic needed |
| **Next.js App Router structure** | Predictable: `app/page.tsx` → route `/`, `app/about/page.tsx` → `/about`. LLM can infer routing without inspecting |
| **`.next/` source maps** | Already generated in dev mode. Maps bundled output → original TSX |
| **`@babel/parser` + traverse** | Parse JSX AST to find component boundaries, prop definitions, Tailwind class strings — programmatic edits instead of regex |
| **Next.js Error Overlay** | Already does element → source mapping. Same primitives are available to us |
| **Turbopack (Next 15+)** | Even faster HMR. Sub-100ms updates in dev |

---

## 4. Rethinking Screenshots

Initial instinct was that screenshots are a core input. On reflection, they're **a nice-to-have validation step, not a foundation**.

### What screenshots DON'T do well
- **Element identification** — React DevTools + DOM is *better*. A screenshot is a raster image; the LLM has to guess which pixels are which element. With React, we know *exactly* which component rendered what.
- **Style extraction** — Computed styles from `getComputedStyle()` give you exact hex values, px sizes, font families. A screenshot gives you pixels to infer from.
- **Source mapping** — A screenshot tells you nothing about which file to edit. React DevTools do.

### What screenshots ARE good for
- **Post-edit validation** — "Does this look right?" after the LLM edits a component, HMR refreshes. Quick in-terminal check without switching windows.
- **Spatial reasoning fallback** — "move this next to that" or "make these two elements the same width". But even here, bounding boxes from `getBoundingClientRect()` are more precise.
- **Colour accuracy** — Gradients, shadows, image rendering. Computed styles tell you the *declared* values, but not always how they compose visually.
- **LLM confusion fallback** — When structural data isn't enough ("the user says it looks broken but the code looks fine").

### The real "visual context" for a React project

```
React component tree (structural)
+ DOM structure (semantic)
+ Computed styles (visual, precise)
+ Bounding boxes (spatial, precise)
+ Source code (editable)
```

That's all extractable via React DevTools + CDP without a single pixel of raster data.

---

## 5. Existing Projects & Prior Art

### Onlook (⭐ most relevant)

- **Open-source**, AI-first visual editor for React and Next.js
- **GitHub:** https://github.com/onlook-dev/onlook/
- **Docs:** https://docs.onlook.com/developers/architecture
- Maps DOM elements to source code using build-time `data-oid` injection
- Click element → AST parsing → node transformation → write back to source → HMR refresh
- Desktop app is essentially a browser pointing at local dev server with injected communication

### vite-plugin-react-click-to-component

- **GitHub:** https://github.com/ArnaudBarre/vite-plugin-react-click-to-component
- Injects source location into React fiber nodes for click-to-jump-to-editor
- Uses React 19's `jsxDEV` instead of DOM attributes
- **Simpler but less metadata** — only gets you file:line, not full component tree
- Caveats: React 19 and React Router 7 compatibility issues

### vite-plugin-visual-edit

- **GitHub:** https://github.com/Joinguyen/vite-plugin-visual-edit
- Injects `data-source-location` attributes into JSX via postMessage
- Enables browser-side visual edits that sync back to source files
- Same principle as Onlook, Vite-specific, less mature

### OpenDesignR

- **GitHub:** https://github.com/opendesignr/opendesignr
- Zero-build React canvas CLI for AI agents
- Render JSX → screenshot → compare pixels for validation
- Uses `babel-standalone` for browser-based transpilation
- Interesting for **agent validation loop**: edit → render → screenshot → "does it match?"
- Limitation: separate sandbox, not editing your real app

### Puck

- **GitHub:** https://github.com/puckeditor/puck
- Structured page builder with component configs
- Config-driven, not code-first — different model entirely
- Less relevant for our use case

### react-three-editor / editable-jsx

- **GitHub:** https://github.com/pmndrs/react-three-editor, https://github.com/nksaraf/editable-jsx
- Tracks React Three Fiber component trees, maps visual changes back to source
- Specialised for 3D, but the EditableDocument / EditableElement pattern is interesting
- Less directly applicable

---

## 6. Onlook: The Key Reference Implementation

Onlook is the closest existing project to what we're building. Understanding it deeply is critical.

### Architecture Overview

```
┌──────────────────────────────────┐
│  Onlook Desktop App (Electron)  │
│  ┌────────────────────────────┐  │
│  │  Browser (iframe/webview) │  │
│  │  pointing at localhost     │  │
│  │  + injected overlay script │  │
│  │  + postMessage bridge      │  │
│  └────────────┬───────────────┘  │
│               │                   │
│  ┌────────────▼───────────────┐  │
│  │  Editor Panel              │  │
│  │  - Element inspector       │  │
│  │  - Style editor            │  │
│  │  - AI chat                 │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
         ↕ postMessage / IPC
┌──────────────────────────────────┐
│  Local Dev Server (next dev)     │
│  + @onlook/nextjs SWC plugin     │
│  + data-oid injection             │
│  + HMR for instant refresh       │
└──────────────────────────────────┘
```

### Build-Time Instrumentation (`@onlook/nextjs`)

The SWC plugin is the foundation. Configured in `next.config.js`:

```javascript
const path = require('path');
const nextConfig = {
  experimental: {
    swcPlugins: [['@onlook/nextjs', { projectRoot: path.resolve('.') }]],
  },
};
module.exports = nextConfig;
```

**What it does:**
- During the SWC compilation step, the plugin walks the AST of every JSX/TSX file
- It injects a `data-oid` attribute onto every JSX element, encoding:
  - The source file path (relative to project root)
  - The line and column number
  - The component name
- At runtime, every rendered DOM element carries its `data-oid` — a deterministic "sourcemap from DOM to source code"

### The Editing Pipeline

1. **Identify target** — User clicks element in the Onlook editor. The `data-oid` attribute resolves to the exact source code location.
2. **Parse source into AST** — The source file is parsed into an Abstract Syntax Tree using `@babel/parser` (or SWC's parser).
3. **Locate target node** — The AST is traversed to find the exact JSX element matching the `data-oid` (using file + line + column).
4. **Transform the node** — Props, Tailwind classes, styles, or children are modified directly on the AST node. This is precise — no regex, no string replacement, no risk of collateral edits.
5. **Write back to disk** — The modified AST is printed back to the source file. The code formatting is preserved.
6. **HMR refresh** — Next.js Fast Refresh detects the file change and updates the browser without a full reload. The change appears instantly.

### Onlook's Strengths (for us)

- **Proven pattern** — Build-time `data-oid` injection + AST editing is battle-tested
- **Next.js native** — SWC plugin integrates cleanly; no additional build steps
- **Open source** — We can study and adapt the approach
- **No vendor lock-in** — Changes are made directly to source code via AST, not stored in a proprietary format

### Onlook's Limitations (our opportunity)

- **Single-element editing** — Click one element, edit one element. No cross-component reasoning
- **No LLM in the loop** — Onlook's AI is chat-assist, not an agentic reasoner that interprets intent
- **Standalone app** — Requires switching to a separate Electron application
- **Limited to direct manipulation** — Can't express "make the header and footer consistent" or "this layout feels cramped on mobile"
- **No terminal integration** — Completely separate from the developer's coding environment

---

## 7. Proposed Architecture

### React/Next.js-First Design

```
User clicks element in browser (or describes change in Pi)
       │
       ▼
  Element Identification
  ├─ Via click: data-oid → file:line:component
  └─ Via description: LLM infers target from codebase context
       │
       ▼
  React DevTools Protocol (or data-oid lookup)
  → Component name, props, state, source file, line
       │
       ▼
  CDP: getComputedStyle + getBoundingClientRect
  → Exact styles, spatial layout
       │
       ▼
  Pi tool returns structured JSON to LLM
       │
       ▼
  LLM calls Pi's read/edit tools on the source file
  (AST-aware editing preferred over string replacement)
       │
       ▼
  Next.js Fast Refresh (HMR) updates browser
       │
       ▼
  (Optional) screenshot for "looks right?" validation
```

### Component Breakdown

#### 1. Browser Connection (CDP)

Extension connects to an existing Chrome instance or launches one. The app runs in the user's existing dev server — no sandboxing.

```typescript
// Via Puppeteer or raw CDP WebSocket
const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222'
});
```

#### 2. Build-Time Instrumentation (Onlook's plugin)

Copy Onlook's `@onlook/nextjs` SWC plugin approach directly. Add `data-oid` attributes to every JSX element during build.

For projects that don't want the SWC plugin, fall back to:
- React DevTools protocol (runtime, no build step)
- Source maps in `.next/` (runtime resolution)
- `__source` props (React's built-in dev-mode source tracking)

#### 3. Custom Pi Tools (via `pi.registerTool()`)

| Tool | What it does |
|------|--------------|
| `design_inspect` | Given a CSS selector, coordinates, or `data-oid`, extracts: HTML, computed styles, bounding box, React component info, source map location |
| `design_select` | Enters "selection mode" — clicks in browser are intercepted via CDP overlay, element info is returned to Pi |
| `design_screenshot` | Captures page screenshot, returns as image content (optional, for validation) |
| `design_highlight` | Highlights an element in the browser (visual confirmation of what you're about to edit) |
| `design_styles` | Gets computed styles for an element — precise color, spacing, typography values |

Example `design_inspect` tool:

```typescript
pi.registerTool({
  name: "design_inspect",
  label: "Inspect UI Element",
  description: "Inspect a React component in the running app. Returns component name, source file, props, styles, and layout info.",
  parameters: Type.Object({
    selector: Type.String({ description: "CSS selector or data-oid of the element to inspect" }),
  }),
  async execute(toolCallId, params, signal, _onUpdate, ctx) {
    // 1. CDP: resolve selector to DOM element
    // 2. Walk up to find React root
    // 3. React DevTools: component name, props, state, source
    // 4. CDP: getComputedStyle + getBoundingClientRect
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          component: "NavButton",
          file: "src/components/NavButton.tsx",
          line: 8,
          props: { variant: "primary", href: "/about" },
          parentComponent: "Header",
          parentFile: "src/components/Header.tsx",
          computedStyles: {
            "background-color": "rgb(59, 130, 246)",
            "padding": "8px 16px"
          },
          boundingBox: { x: 120, y: 45, width: 88, height: 36 }
        }, null, 2)
      }]
    };
  }
});
```

#### 4. Visual Selection (three strategies)

**Strategy A — Companion Browser + CDP Overlay (recommended)**
- Inject a content script into Chrome via CDP that draws a transparent overlay
- User clicks in the *browser window* to select elements
- CDP forwards click coordinates → extension resolves to DOM element via `document.elementFromPoint()`
- Extension highlights element, confirms with user via Pi's terminal
- Closest experience to Cursor Design Mode

**Strategy B — Terminal-Screenshot + Natural Language**
- `design_screenshot` shows the page as an image in Pi's TUI (Kitty/iTerm2 image protocol)
- User describes what they want in natural language ("make the button blue")
- LLM uses `design_inspect` with CSS selectors it infers from the screenshot + codebase
- Less precise but entirely terminal-native

**Strategy C — Hybrid (most robust)**
- Screenshot shown in Pi for context
- Click selection happens in the browser window (Strategy A)
- Both streams feed the LLM
- Graceful degradation: if no browser connection, fall back to Strategy B

#### 5. AST-Aware Editing

Instead of Pi's default string-replacement `edit` tool, we should prefer AST-based editing for design mode changes. This ensures:
- Tailwind class modifications don't accidentally match strings in comments or other attributes
- JSX prop changes are syntactically correct
- No risk of replacing the wrong instance of a similar string

```typescript
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

// Parse → find the exact JSX element → modify → generate → write back
```

For simple edits (changing a Tailwind class, updating a prop value), the existing `edit` tool works fine. AST editing is for complex or ambiguous cases.

#### 6. The Edit Loop

```
User: "Make the header taller and add a gradient"
  │
  ├─► (Optional) design_screenshot → LLM sees current state
  ├─► User clicks header in browser → design_inspect returns <Header>
  ├─► Source map: src/components/Header.tsx:14
  ├─► LLM calls Pi's read tool → sees the file
  ├─► LLM calls Pi's edit tool → modifies styles/Tailwind classes
  ├─► Next.js Fast Refresh updates browser automatically
  └─► (Optional) design_screenshot → LLM verifies the change
```

---

## 8. Pi Extension Capabilities We'd Use

| Pi Capability | How We Use It |
|---|---|
| `pi.registerTool()` | All `design_*` tools (inspect, select, screenshot, highlight, styles) |
| `ctx.ui.custom()` + `Image` component | Render screenshots in terminal (Kitty/iTerm2/Ghostty/WezTerm) |
| `ctx.ui.confirm/input` | Confirm element selections, get instructions from user |
| `ctx.ui.setStatus()` | Show "🔴 Design Mode Active" in footer |
| `ctx.ui.setWidget()` | Show selected element info above editor while working |
| `before_agent_start` event | Inject design mode context/instructions into system prompt when active |
| `tool_call` event | Intercept `edit`/`write` to optionally validate changes against what's visible |
| `pi.registerCommand("/design")` | Enter/exit design mode |
| `pi.registerShortcut("ctrl+shift+d")` | Toggle design mode (mirrors Cursor's keybinding) |
| `pi.appendEntry()` | Persist design mode state across session reloads |
| Bash tool | Start dev servers, manage Chrome processes |
| `pi.sendMessage()` | Inject design context mid-turn when user activates design mode during streaming |
| SDK `createAgentSession()` | Could build a standalone web UI that embeds Pi as the agent backend |

---

## 9. Caveats & Limitations

### Technical Constraints

1. **No native browser in terminal** — Requires a separate Chrome window. Two-window workflow vs. Cursor's single window. Not a blocker, but a UX difference.

2. **Image rendering depends on terminal** — Kitty, iTerm2, Ghostty, WezTerm support inline images. Other terminals fall back to text-only (DOM tree view or URL to open externally).

3. **Source map quality varies** — Tracing element → source file works well for React/Next.js with proper build setups, but can be fragile for:
   - Non-framework code (plain HTML/CSS)
   - Minified production builds (we're dev-only, so this is less of an issue)
   - Dynamic component names (e.g., `styled-components` generating random class names)

4. **React DevTools protocol stability** — The DevTools backend protocol is not officially documented for external consumers. It works and is widely used, but could change between React versions.

5. **SWC plugin compatibility** — Onlook's `@onlook/nextjs` plugin targets specific Next.js versions. Will need maintenance as Next.js evolves.

### UX Constraints

6. **Multi-element selection** — Cursor lets you box-select multiple elements. CDP can do this with `document.elementsFromPoint()` for multiple coordinates, but the UX in a separate browser is less fluid than Cursor's integrated approach.

7. **Voice input** — Cursor supports voice commands. Possible with Whisper API + Pi shortcut, but would be a later addition and adds complexity.

8. **Framework-specific intelligence** — Cursor likely has deep React/Vue integrations for knowing which component to edit. We'd rely more on source maps + LLM inference, which is good but less deterministic for edge cases.

### Performance Considerations

9. **CDP round-trips** — Screenshot + inspection adds latency. Caching and incremental updates help.

10. **AST parsing on every edit** — For complex edits, we parse, traverse, modify, and regenerate. This is fast (~ms for single files) but adds up if editing many files.

---

## 10. Recommendations & Next Steps

### Phase 1: MVP — Element Inspection + LLM-Driven Edits

- Build Pi extension with `/design` command
- CDP connection to user's browser + dev server
- `design_inspect` tool: click element → get component info + source location
- `design_highlight` tool: visual confirmation of selected element
- LLM uses standard `read`/`edit` tools to make changes
- Next.js Fast Refresh handles the preview loop
- **No custom SWC plugin yet** — rely on React DevTools protocol + `__source` props for source mapping

**Outcome:** "Click an element, describe what you want changed, LLM edits the code."

### Phase 2: Build-Time Instrumentation

- Integrate Onlook's `@onlook/nextjs` SWC plugin (or build our own inspired by it)
- `data-oid` injection gives us deterministic element → source mapping
- Enable `design_select` tool: click in browser → instant resolution to source location
- Add AST-aware editing for precise JSX transformations

**Outcome:** Reliable, deterministic element selection + precise code editing.

### Phase 3: Visual Feedback + Validation

- `design_screenshot` tool with terminal image rendering
- Post-edit validation loop: screenshot → "does it match the intent?"
- Positional awareness: bounding boxes for spatial reasoning
- `design_styles` tool for detailed computed style inspection

**Outcome:** "Edit → see the result → verify" without switching windows.

### Phase 4: Advanced Features

- Multi-element selection and cross-component edits
- Voice input via Whisper API
- Design mode widget (persistent element info above editor)
- Integration with `pi.ui.custom()` for rich TUI overlays
- Component-aware suggestions ("this pattern is inconsistent with NavButton")

**Outcome:** Parity with Cursor's Design Mode feature set, with added LLM reasoning.

---

## Key Decision Points

| Decision | Options | Recommendation |
|---|---|---|
| **Element → source mapping** | Onlook's `data-oid` / React DevTools / `__source` props / Source maps | Start with React DevTools (zero setup), add `data-oid` for production reliability |
| **Selection UX** | Browser click / Terminal screenshot+NL / Hybrid | **Hybrid** — click in browser for precision, screenshot in terminal for context |
| **Code editing** | String replacement (Pi's `edit`) / AST transformation | String replacement for simple cases, AST for complex JSX changes |
| **Browser connection** | Launch Chrome / Connect to existing | **Connect to existing** — developer already has dev server running |
| **Onlook's SWC plugin** | Use directly / Build our own / Skip | **Start by skipping** (use React DevTools), evaluate Onlook's plugin in Phase 2 |
| **Standalone vs embedded** | Separate app / Pi extension only | **Pi extension only** — terminal-native is the point |

---

*This report represents the findings from research into Cursor Design Mode, Pi's extension model, React/Next.js tooling, and existing open-source projects (primarily Onlook). The architecture proposed is untested and would need validation through prototyping.*
