import { describe, it, expect } from "vitest";
import { injectDataOid, formatDataOid, parseDataOid } from "../src/index.js";

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

  it("injects data-oid on nested JSX elements", () => {
    const source = `export default function Page() {
  return <div><span>Hello</span></div>;
}`;
    const result = injectDataOid(source, "src/Page.tsx", PROJECT_ROOT);

    // Should have two data-oid attributes — one for div, one for span
    const matches = result.match(/data-oid="c:[^"]+"/g);
    expect(matches).toHaveLength(2);
    // Both should reference the same file but different line:column
    expect(matches![0]).not.toBe(matches![1]);
  });

  it("injects distinct data-oid on same-line elements", () => {
    const source = `export default function Page() {
  return <div><span>a</span><span>b</span></div>;
}`;
    const result = injectDataOid(source, "src/Page.tsx", PROJECT_ROOT);

    // 3 elements: div + 2 spans, all potentially on same line
    const matches = result.match(/data-oid="c:[^"]+"/g);
    expect(matches).toHaveLength(3);
    // All three must be distinct
    expect(new Set(matches).size).toBe(3);
  });

  it("injects data-oid on custom component elements", () => {
    const source = `export default function Page() {
  return <MyComponent prop="value" />;
}`;
    const result = injectDataOid(source, "src/Page.tsx", PROJECT_ROOT);

    // Should have a data-oid on MyComponent
    expect(result).toMatch(/data-oid="c:[^"]+:src\/Page\.tsx:\d+:\d+"/);
    // Should preserve existing props
    expect(result).toContain('prop="value"');
  });

  it("uses a deterministic hash of the project root", () => {
    const source = `export default function Page() {
  return <div>Hello</div>;
}`;
    const result1 = injectDataOid(source, "src/Page.tsx", "/home/user/my-app");
    const result2 = injectDataOid(source, "src/Page.tsx", "/home/user/my-app");
    const result3 = injectDataOid(source, "src/Page.tsx", "/home/user/other-app");

    const oid1 = result1.match(/data-oid="c:([^:]+):/)?.[1];
    const oid2 = result2.match(/data-oid="c:([^:]+):/)?.[1];
    const oid3 = result3.match(/data-oid="c:([^:]+):/)?.[1];

    expect(oid1).toBe(oid2); // Same root → same hash
    expect(oid1).not.toBe(oid3); // Different root → different hash
  });

  it("preserves existing attributes on elements", () => {
    const source = `export default function Page() {
  return <div className="container" id="main">Hello</div>;
}`;
    const result = injectDataOid(source, "src/Page.tsx", PROJECT_ROOT);

    expect(result).toContain('className="container"');
    expect(result).toContain('id="main"');
    expect(result).toContain("Hello");
  });

  it("does not inject data-oid on JSX fragments", () => {
    const source = `export default function Page() {
  return <><span>a</span><span>b</span></>;
}`;
    const result = injectDataOid(source, "src/Page.tsx", PROJECT_ROOT);

    // Fragments don't render to DOM, so no data-oid on them
    // But the spans inside should still get data-oid
    const matches = result.match(/data-oid="c:[^"]+"/g);
    expect(matches).toHaveLength(2);
  });

  it("does not re-inject data-oid if one already exists", () => {
    const source = `export default function Page() {
  return <div data-oid="c:abc123:r:src/Foo.tsx:1:1">Hello</div>;
}`;
    const result = injectDataOid(source, "src/Page.tsx", PROJECT_ROOT);

    // Should not add a second data-oid
    const matches = result.match(/data-oid="c:[^"]+"/g);
    expect(matches).toHaveLength(1);
    expect(result).toContain('data-oid="c:abc123:r:src/Foo.tsx:1:1"');
  });
});

describe("parseDataOid", () => {
  it("round-trips through format and parse", () => {
    const parts = {
      type: "c",
      projectHash: "abc12345",
      filePath: "src/components/Header.tsx",
      line: 42,
      column: 8,
    };
    const formatted = formatDataOid(parts);
    const parsed = parseDataOid(formatted);

    expect(parsed).toEqual(parts);
  });

  it("returns null for malformed data-oid", () => {
    expect(parseDataOid("not-a-valid-oid")).toBeNull();
    expect(parseDataOid("")).toBeNull();
  });
});
