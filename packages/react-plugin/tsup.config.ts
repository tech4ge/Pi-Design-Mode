import { defineConfig } from "tsup";

export default defineConfig([
  // Main ESM entries — runs first, cleans dist
  {
    entry: {
      index: "src/index.ts",
      "vite-plugin": "src/vite-plugin.ts",
      "data-oid": "src/data-oid/index.ts",
      "data-oid-shared": "src/data-oid/shared.ts",
      "protocol": "src/protocol.ts",
      transform: "src/transform.ts",
      next: "src/next.tsx",
    },
    format: ["esm"],
    splitting: true,
    dts: false,
    clean: true,
    sourcemap: true,
    external: ["react", "react-dom", "@pi-design/react-plugin/browser-client", "fs", "path", "url"],
  },
  // Browser client — self-contained IIFE, auto-executes on load
  {
    entry: {
      "browser-client": "src/browser-client.ts",
    },
    format: ["iife"],
    splitting: false,
    dts: false,
    clean: false,
    sourcemap: true,
    // No globalName — produces a bare IIFE that runs on import
    outExtension: () => ({ js: ".js" }),
  },
]);
