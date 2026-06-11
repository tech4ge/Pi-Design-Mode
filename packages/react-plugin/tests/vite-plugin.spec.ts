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

    // Extract data-oid values from both
    const viteOid = viteResult.code.match(/data-oid="([^"]+)"/)?.[1];
    const coreOid = coreResult.match(/data-oid="([^"]+)"/)?.[1];

    expect(viteOid).toBe(coreOid);
  });
});
