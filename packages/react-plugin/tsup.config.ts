import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "vite-plugin": "src/vite-plugin.ts",
    "data-oid": "src/data-oid.ts",
    transform: "src/transform.ts",
    client: "src/client.ts",
    next: "src/next.tsx",
  },
  format: ["esm"],
  splitting: true,
  dts: false,
  clean: true,
  sourcemap: true,
  external: ["react", "react-dom", "@pi-design/react-plugin/client"],
});
