import { describe, it, expect } from "vitest";
import { parseDataOid, formatDataOid, type DataOidComponents } from "../src/data-oid/shared.js";

describe("parseDataOid", () => {
  it("parses Babel/Vite format: c:H:r:file:line:column", () => {
    const result = parseDataOid("c:abc12345:r:src/components/Header.tsx:42:8");
    expect(result).toEqual({
      type: "c",
      projectHash: "abc12345",
      filePath: "src/components/Header.tsx",
      line: 42,
      column: 8,
    });
  });

  it("parses element type marker 'e'", () => {
    const result = parseDataOid("e:deadbeef:r:src/App.tsx:10:5");
    expect(result).toEqual({
      type: "e",
      projectHash: "deadbeef",
      filePath: "src/App.tsx",
      line: 10,
      column: 5,
    });
  });

  it("parses fragment type marker 'f'", () => {
    const result = parseDataOid("f:cafe1234:r:src/Layout.tsx:3:1");
    expect(result).toEqual({
      type: "f",
      projectHash: "cafe1234",
      filePath: "src/Layout.tsx",
      line: 3,
      column: 1,
    });
  });

  it("parses SWC format: file:line:column", () => {
    const result = parseDataOid("src/components/Button.tsx:15:12");
    expect(result).toEqual({
      type: "c",
      projectHash: "",
      filePath: "src/components/Button.tsx",
      line: 15,
      column: 12,
    });
  });

  it("parses SWC format: file:line (no column)", () => {
    const result = parseDataOid("src/components/Button.tsx:15");
    expect(result).toEqual({
      type: "c",
      projectHash: "",
      filePath: "src/components/Button.tsx",
      line: 15,
      column: 0,
    });
  });

  it("returns null for malformed data-oid", () => {
    expect(parseDataOid("not-a-valid-oid")).toBeNull();
    expect(parseDataOid("")).toBeNull();
  });

  it("returns null for partial Babel format missing fields", () => {
    expect(parseDataOid("c:abc:r:file.tsx")).toBeNull();
  });
});

describe("formatDataOid", () => {
  it("formats a Babel/Vite data-oid", () => {
    const result = formatDataOid({
      type: "c",
      projectHash: "abc12345",
      filePath: "src/components/Header.tsx",
      line: 42,
      column: 8,
    });
    expect(result).toBe("c:abc12345:r:src/components/Header.tsx:42:8");
  });

  it("round-trips through format and parse", () => {
    const parts: DataOidComponents = {
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

  it("round-trips with different type markers", () => {
    for (const type of ["c", "e", "f"] as const) {
      const parts: DataOidComponents = {
        type,
        projectHash: "deadbeef",
        filePath: "src/Test.tsx",
        line: 1,
        column: 1,
      };
      expect(parseDataOid(formatDataOid(parts))).toEqual(parts);
    }
  });
});
