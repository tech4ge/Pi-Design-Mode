import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  target: "node18",
  clean: true,
  sourcemap: false,
  // Bundle everything except the Pi SDK (provided at runtime)
  external: ["@earendil-works/pi-coding-agent", "typebox"],
  // No splitting needed — single entry point
  splitting: false,
  dts: false,
  // Inline all deps (Babel, ws, typebox, @pi-design/react-plugin/data-oid)
  noExternal: [
    "@babel/parser",
    "@babel/traverse",
    "@babel/generator",
    "@babel/types",
    "ws",
    "@sinclair/typebox",
    "@pi-design/react-plugin",
  ],
});
