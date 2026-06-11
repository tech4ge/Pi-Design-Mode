import { injectDataOid } from "./transform.js";
import type { Plugin } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const VIRTUAL_CLIENT_ID = "virtual:pi-design-client";
const VIRTUAL_CLIENT_RESOLVED = "\0" + VIRTUAL_CLIENT_ID;

// Resolve the built browser-client.js
// When built (dist/vite-plugin.js), browser-client.js is a sibling
// When running from source (tests import src/), we need to go to dist/
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BROWSER_CLIENT_PATH = fs.existsSync(path.resolve(__dirname, "browser-client.js"))
  ? path.resolve(__dirname, "browser-client.js")
  : path.resolve(__dirname, "..", "dist", "browser-client.js");

interface PiDesignViteOptions {
  projectRoot: string;
}

/**
 * Vite plugin for Pi Design Mode.
 *
 * 1. Injects data-oid attributes on every JSX element during dev mode.
 * 2. Serves the browser client script as a virtual module so the browser
 *    connects to the WS server, handles Alt+Click, and renders the widget.
 */
export function piDesignVitePlugin(options: PiDesignViteOptions): Plugin {
  return {
    name: "pi-design-react-plugin",
    enforce: "pre",
    apply: "serve", // Dev mode only

    resolveId(source) {
      if (source === VIRTUAL_CLIENT_ID) {
        return VIRTUAL_CLIENT_RESOLVED;
      }
    },

    load(id) {
      if (id === VIRTUAL_CLIENT_RESOLVED) {
        return fs.readFileSync(BROWSER_CLIENT_PATH, "utf8");
      }
    },

    transform(code: string, id: string) {
      // Skip node_modules
      if (id.includes("node_modules")) return null;

      // Inject client script import into the app entry point (main.tsx/index.tsx)
      if (/\/main\.(tsx|jsx|ts|js)$/.test(id) || /\/index\.(tsx|jsx)$/.test(id)) {
        const clientImport = `import "${VIRTUAL_CLIENT_ID}";\n`;
        return {
          code: clientImport + code,
          map: null,
        };
      }

      // Transform TSX/JSX files with data-oid injection
      if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) return null;

      const result = injectDataOid(code, id, options.projectRoot);

      return {
        code: result,
        map: null, // TODO: generate source map
      };
    },
  };
}
