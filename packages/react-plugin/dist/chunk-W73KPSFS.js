import {
  injectDataOid
} from "./chunk-6ZFKMQWJ.js";

// src/vite-plugin.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var VIRTUAL_CLIENT_ID = "virtual:pi-design-client";
var VIRTUAL_CLIENT_RESOLVED = "\0" + VIRTUAL_CLIENT_ID;
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var BROWSER_CLIENT_PATH = fs.existsSync(path.resolve(__dirname, "browser-client.js")) ? path.resolve(__dirname, "browser-client.js") : path.resolve(__dirname, "..", "dist", "browser-client.js");
function piDesignVitePlugin(options) {
  return {
    name: "pi-design-react-plugin",
    enforce: "pre",
    apply: "serve",
    // Dev mode only
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
    transform(code, id) {
      if (id.includes("node_modules")) return null;
      if (/\/main\.(tsx|jsx|ts|js)$/.test(id) || /\/index\.(tsx|jsx)$/.test(id)) {
        const clientImport = `import "${VIRTUAL_CLIENT_ID}";
`;
        return {
          code: clientImport + code,
          map: null
        };
      }
      if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) return null;
      const result = injectDataOid(code, id, options.projectRoot);
      return {
        code: result,
        map: null
        // TODO: generate source map
      };
    }
  };
}

export {
  piDesignVitePlugin
};
//# sourceMappingURL=chunk-W73KPSFS.js.map