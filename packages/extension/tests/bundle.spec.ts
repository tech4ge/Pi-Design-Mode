import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const DIST_PATH = path.resolve(__dirname, "../dist/index.js");

describe("extension bundle", () => {
  it("produces dist/index.js after build", () => {
    expect(fs.existsSync(DIST_PATH)).toBe(true);
  });

  it("inlines all dependencies except @earendil-works/pi-coding-agent", () => {
    const code = fs.readFileSync(DIST_PATH, "utf8");
    // Pi SDK is external — should not be inlined
    expect(code).not.toContain("@earendil-works/pi-coding-agent/dist/");
    // ws, Babel should be inlined (no bare import of them)
    expect(code).not.toMatch(/from\s+["']ws["']/);
    expect(code).not.toMatch(/from\s+["']@babel\/parser["']/);
    expect(code).not.toMatch(/from\s+["']@babel\/traverse["']/);
    expect(code).not.toMatch(/from\s+["']@babel\/generator["']/);
  });

  it("contains the extension entry point logic", () => {
    const code = fs.readFileSync(DIST_PATH, "utf8");
    expect(code).toContain("design_inspect");
    expect(code).toContain("DesignModeServer");
  });

  it("contains parseDataOid from react-plugin (deduped)", () => {
    const code = fs.readFileSync(DIST_PATH, "utf8");
    expect(code).toContain("parseDataOid");
  });

  it("does not import from @pi-design/react-plugin at runtime", () => {
    const code = fs.readFileSync(DIST_PATH, "utf8");
    // The build-time import should be resolved — no bare import left
    expect(code).not.toMatch(/from\s+["']@pi-design\/react-plugin/);
  });
});
