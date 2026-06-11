import { describe, it, expect } from "vitest";
import { piDesignVitePlugin } from "../src/vite-plugin.js";
import { injectDataOid } from "../src/transform.js";
import type { TransformResult } from "vite";

const PROJECT_ROOT = "/home/user/my-app";

describe("piDesignVitePlugin", () => {
  it("transforms TSX with data-oid injection via Vite plugin interface", async () => {
    const plugin = piDesignVitePlugin({ projectRoot: PROJECT_ROOT });
    const transformFn = plugin.transform as unknown as (code: string, id: string) => TransformResult | null;

    const source = `export default function Page() {
  return <div>Hello</div>;
}`;

    const result = transformFn(source, "src/Page.tsx");
    expect(result).not.toBeNull();
    expect(result.code).toMatch(/data-oid="c:[^:]+:r:src\/Page\.tsx:\d+:\d+"/);
    expect(result.code).toContain("Hello");
  });

  it("skips non-TSX files", async () => {
    const plugin = piDesignVitePlugin({ projectRoot: PROJECT_ROOT });
    const transformFn = plugin.transform as unknown as (code: string, id: string) => TransformResult | null;

    const source = `export const x = 1;`;
    const result = transformFn(source, "src/utils.ts");
    expect(result).toBeNull();
  });

  it("produces the same data-oid format as the core transform", async () => {
    const plugin = piDesignVitePlugin({ projectRoot: PROJECT_ROOT });
    const transformFn = plugin.transform as unknown as (code: string, id: string) => TransformResult | null;

    const source = `export default function Page() {
  return <div className="container">Hello</div>;
}`;

    const viteResult = transformFn(source, "src/Page.tsx");
    const coreResult = injectDataOid(source, "src/Page.tsx", PROJECT_ROOT);

    const viteOid = viteResult.code.match(/data-oid="([^"]+)"/)?.[1];
    const coreOid = coreResult.match(/data-oid="([^"]+)"/)?.[1];

    expect(viteOid).toBe(coreOid);
  });

  it("resolves virtual:pi-design-client module", () => {
    const plugin = piDesignVitePlugin({ projectRoot: PROJECT_ROOT });
    const resolveId = plugin.resolveId as unknown as (source: string) => string | null;

    const result = resolveId("virtual:pi-design-client");
    expect(result).toBe("\0virtual:pi-design-client");
  });

  it("loads client script from virtual module", () => {
    const plugin = piDesignVitePlugin({ projectRoot: PROJECT_ROOT });
    const load = plugin.load as unknown as (id: string) => string | null;

    const result = load("\0virtual:pi-design-client");
    expect(result).not.toBeNull();
    expect(result).toContain("WS_PORT = 9481");
    expect(result).toContain("handleAltClick");
    expect(result).toContain("createWidget");
  });

  it("injects custom WS port into client script", () => {
    const plugin = piDesignVitePlugin({ projectRoot: PROJECT_ROOT, wsPort: 5555 });
    const load = plugin.load as unknown as (id: string) => string | null;

    const result = load("\0virtual:pi-design-client");
    expect(result).toContain("WS_PORT = 5555");
  });

  it("client script does not contain node:crypto", () => {
    const plugin = piDesignVitePlugin({ projectRoot: PROJECT_ROOT });
    const load = plugin.load as unknown as (id: string) => string | null;

    const result = load("\0virtual:pi-design-client");
    expect(result).not.toContain("node:crypto");
    expect(result).toContain("parseDataOid");
  });

  it("injects client script import into main.tsx", () => {
    const plugin = piDesignVitePlugin({ projectRoot: PROJECT_ROOT });
    const transformFn = plugin.transform as unknown as (code: string, id: string) => TransformResult | null;

    const source = `import React from "react";\nReactDOM.createRoot(document.getElementById("root")!).render(<App />);`;
    const result = transformFn(source, "/home/user/my-app/src/main.tsx");
    expect(result).not.toBeNull();
    expect(result!.code).toContain('import "virtual:pi-design-client"');
    expect(result!.code).toContain("ReactDOM"); // Original code preserved
  });
});
