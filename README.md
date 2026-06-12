# Pi Design Mode

Click elements in your browser, describe changes, and the LLM edits your source code with instant HMR preview. A Cursor Design Mode–style workflow for terminal-based React/Next.js development with [Pi](https://github.com/earendil-works/pi-coding-agent).

## Quick Start: Vite + React

**1. Install the plugin**

```bash
npm install @pi-design/react-plugin
```

**2. Add to your Vite config**

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

**3. Start designing**

```bash
# In Pi, run:
/design
```

Open your app in the browser. The Pi Design widget appears automatically. Alt+Click any element to select it, type a change, and submit.

## Quick Start: Next.js

**1. Install the plugin and SWC source tracker**

```bash
npm install @pi-design/react-plugin swc-plugin-react-source-string
```

**2. Configure the SWC plugin**

```ts
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    swcPlugins: [
      ["swc-plugin-react-source-string", { attr: "data-oid" }],
    ],
  },
};
```

**3. Add the client component to your root layout**

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

**4. Start designing**

```bash
# In Pi, run:
/design
```

## How It Works

1. **Data attributes** — The Vite plugin (Babel) or Next.js SWC plugin injects `data-oid` attributes onto every JSX element during development, encoding the source file location.

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

## Development

### Build the extension

```bash
cd packages/extension
npm run build
```

### Install the extension locally

Copy the built extension to Pi's extensions directory:

```bash
cp -r packages/extension/dist ~/.pi/agent/extensions/pi-design-mode/dist
cp packages/extension/package.json ~/.pi/agent/extensions/pi-design-mode/
```

Then reload Pi with `/reload`.

### Build the react-plugin

```bash
cd packages/react-plugin
npm run build
```

### Run tests

```bash
# Extension tests (21)
cd packages/extension && npm test

# React-plugin tests (24)
cd packages/react-plugin && npm test
```

### Verify npm package contents

```bash
cd packages/react-plugin && npm pack --dry-run
```
