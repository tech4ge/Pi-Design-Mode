import { injectDataOid } from "./transform.js";
import type { Plugin } from "vite";

interface PiDesignViteOptions {
  projectRoot: string;
}

/**
 * Vite plugin for Pi Design Mode.
 * Injects data-oid attributes on every JSX element during dev mode.
 */
export function piDesignVitePlugin(options: PiDesignViteOptions): Plugin {
  return {
    name: "pi-design-react-plugin",
    enforce: "pre",
    apply: "serve", // Dev mode only

    transform(code: string, id: string) {
      // Only transform TSX/JSX files
      if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) return null;

      // Skip node_modules
      if (id.includes("node_modules")) return null;

      const result = injectDataOid(code, id, options.projectRoot);

      return {
        code: result,
        map: null, // TODO: generate source map
      };
    },
  };
}
