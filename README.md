# Pi Design Mode

![Pi Design Mode demo](https://github.com/tech4ge/Pi-Design-Mode/releases/download/v0.0.1-placeholder/Screen-Now-20260611T100559-compressed.gif)

Click elements in your browser, describe changes, and the LLM edits your source code with instant HMR preview. A Cursor Design Mode–style workflow for terminal-based React/Next.js development with [Pi](https://github.com/earendil-works/pi-coding-agent).

## Overview

Pi Design Mode has two parts you install separately:

| Part | What it does | Install how |
|------|-------------|------------|
| **Pi extension** | `/design` command, WebSocket server | `pi install git:github.com/tech4ge/Pi-Design-Mode` |
| **React plugin** | Browser client, build transforms, Next.js component | `npm install github:tech4ge/Pi-Design-Mode` |

You need **both** — the extension runs in Pi, the plugin runs in your app.

## Quick Start: Vite + React

**1. Install the Pi extension**

```bash
pi install git:github.com/tech4ge/Pi-Design-Mode
```

**2. Install the react plugin in your project**

```bash
npm install github:tech4ge/Pi-Design-Mode
```

**3. Add to your Vite config**

```ts
// vite.config.ts
import { piDesignVitePlugin } from "@pi-design/react-plugin/vite";

export default defineConfig({
  plugins: [
    react(),
    piDesignVitePlugin({ projectRoot: import.meta.dirname }),
  ],
});
```

**4. Start designing**

```bash
# In Pi, run:
/design
```

Open your app in the browser. The Pi Design widget appears automatically. Alt+Click any element to select it, type a change, and submit.

## Quick Start: Next.js

**1. Install the Pi extension**

```bash
pi install git:github.com/tech4ge/Pi-Design-Mode
```

**2. Install the react plugin and SWC source tracker in your project**

```bash
npm install github:tech4ge/Pi-Design-Mode swc-plugin-react-source-string
```

**3. Configure the SWC plugin**

Next.js uses [SWC](https://swc.rs/) (not Babel) for transforms, so the Vite/Babel plugin that injects `data-oid` attributes won't work. Instead, we use [swc-plugin-react-source-string](https://github.com/tanchu/swc-plugin-react-source) which adds `data-source` attributes to JSX elements at compile time. Pi Design Mode reads these to locate elements in your source code.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    swcPlugins: [
      ["swc-plugin-react-source-string", { root: process.cwd() }],
    ],
  },
};
```

**4. Add the client component to your root layout**

```tsx
// app/layout.tsx
import { PiDesignClient } from "@pi-design/react-plugin/next";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PiDesignClient />
        {children}
      </body>
    </html>
  );
}
```

**5. Start designing**

```bash
# In Pi, run:
/design
```

## How It Works

1. **Data attributes** — The Vite plugin (Babel) or Next.js SWC plugin injects source-location attributes onto every JSX element during development, encoding the source file path and line number.

2. **WebSocket server** — `/design` starts a WS server on port 9481 (configurable via `window.__PI_DESIGN_PORT`).

3. **Browser widget** — The plugin auto-injects a client script that connects to the WS server, handles Alt+Click selection, and renders a floating widget for submitting changes.

4. **`design_inspect` tool** — When you submit a change, Pi calls `design_inspect` which parses the source file and returns element info (tag name, props, parent component, text content).

5. **Code edit** — Pi edits the source file. HMR updates the browser instantly.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **Alt+Click** | Select / deselect an element |
| **Alt+Hover** | Preview element info before selecting |
| **Esc** | Clear all selections |
| **Alt+R** | Recall last set of selections |
| **✕ button** | Disconnect from Pi (close widget) |

## Configuration

### `PiDesignViteOptions`

| Option | Type | Description |
|---|---|---|
| `projectRoot` | `string` | **Required.** Absolute path to your project root. Used for relative file paths in `data-oid`. |

### `window.__PI_DESIGN_PORT`

Override the WebSocket port (default: 9481). Set before the client script loads:

```html
<script>window.__PI_DESIGN_PORT = 3001;</script>
```

## Commands

| Command | Description |
|---|---|
| `/design` | Toggle design mode on/off. Starts the WS server and waits for browser connections. |

## Architecture

The project is a monorepo with two packages:

- **`@pi-design/react-plugin`** — Vite plugin, Next.js component, browser client, and source transform.
- **`@pi-design/extension`** — Pi extension providing the `/design` command and WebSocket server. Installed via `pi install`.

The browser client (`packages/react-plugin/src/browser-client.ts`) is built as a single IIFE and injected into the page at runtime. Business logic is extracted into testable modules under `browser-client/`:

| Module | Purpose |
|--------|---------|
| `history.ts` | Instruction history in localStorage |
| `hover-tooltip.ts` | Alt+Hover tooltip |
| `selection.ts` | Selection array management |
| `click-handler.ts` | Build selection data from click target |
| `connection.ts` | Server message routing |
| `widget.ts` | Widget state (connected, processing, error) |
| `utils.ts` | escapeHtml, getSelector, computeStructuralContext |
| `highlight.ts` | DOM highlight application |
| `widget-dom.ts` | Widget shadow DOM creation |
| `widget-template.ts` | CSS + HTML template constants |

## Development

### Build

```bash
# Both packages
npm run build

# Individual packages
cd packages/react-plugin && npm run build
cd packages/extension && npm run build
```

### Run tests

```bash
# React-plugin tests (92)
cd packages/react-plugin && npm test

# Extension tests (21)
cd packages/extension && npm test
```

### Verify npm package contents

```bash
cd packages/react-plugin && npm pack --dry-run
cd packages/extension && npm pack --dry-run
```
