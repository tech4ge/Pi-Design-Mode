import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const DIST_PATH = path.resolve(__dirname, "../dist/browser-client.js");

describe("browser-client build artifact", () => {
  it("dist/browser-client.js exists after build", () => {
    // This test validates the build output exists — run `npm run build` first
    expect(fs.existsSync(DIST_PATH)).toBe(true);
  });

  it("contains key function names", () => {
    if (!fs.existsSync(DIST_PATH)) return;
    const code = fs.readFileSync(DIST_PATH, "utf8");
    expect(code).toContain("createWidget");
    expect(code).toContain("findByOid");
    expect(code).toContain("parseDataOid");
    expect(code).toContain("handleAltClick");
  });

  it("contains data-source attribute support", () => {
    if (!fs.existsSync(DIST_PATH)) return;
    const code = fs.readFileSync(DIST_PATH, "utf8");
    expect(code).toContain("data-source");
  });

  it("uses __PI_DESIGN_PORT for WS port discovery", () => {
    if (!fs.existsSync(DIST_PATH)) return;
    const code = fs.readFileSync(DIST_PATH, "utf8");
    expect(code).toContain("__PI_DESIGN_PORT");
    expect(code).toContain("9481");
  });

  it("has no node:crypto or require() references", () => {
    if (!fs.existsSync(DIST_PATH)) return;
    const code = fs.readFileSync(DIST_PATH, "utf8");
    expect(code).not.toContain("node:crypto");
    expect(code).not.toMatch(/require\s*\(/);
  });

  it("has no ESM import statements", () => {
    if (!fs.existsSync(DIST_PATH)) return;
    const code = fs.readFileSync(DIST_PATH, "utf8");
    // Allow import.meta (used by bundlers), but no `import X from` statements
    expect(code).not.toMatch(/^\s*import\s+/m);
  });
});
