import { describe, it, expect } from "vitest";
import { injectDataOid } from "../src/transform.js";

const PROJECT_ROOT = "/home/user/my-app";

describe("injectDataOid", () => {
  it("injects data-oid on a simple JSX element", () => {
    const source = `export default function Page() {
  return <div>Hello</div>;
}`;
    const result = injectDataOid(source, "src/Page.tsx", PROJECT_ROOT);

    // Should contain a data-oid attribute on the div
    expect(result).toMatch(/data-oid="c:[^:]+:r:src\/Page\.tsx:\d+:\d+"/);
    // Should still contain the original content
    expect(result).toContain("Hello");
  });
});
