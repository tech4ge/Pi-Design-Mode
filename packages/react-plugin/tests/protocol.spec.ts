import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SOURCE_PATH = path.resolve(__dirname, "../src/protocol.ts");

describe("protocol module", () => {
  it("exists as a file", () => {
    expect(fs.existsSync(SOURCE_PATH)).toBe(true);
  });

  it("exports ClientMessage type with all discriminator values", () => {
    const source = fs.readFileSync(SOURCE_PATH, "utf8");
    expect(source).toContain("design:connect");
    expect(source).toContain("design:select");
    expect(source).toContain("design:submit");
    expect(source).toContain("design:deselect");
    expect(source).toContain("design:disconnect");
  });

  it("exports ServerMessage type with all discriminator values", () => {
    const source = fs.readFileSync(SOURCE_PATH, "utf8");
    expect(source).toContain("design:mode:on");
    expect(source).toContain("design:mode:off");
    expect(source).toContain("design:highlight");
    expect(source).toContain("design:processing");
    expect(source).toContain("design:done");
    expect(source).toContain("design:error");
  });

  it("has no Node.js imports", () => {
    const source = fs.readFileSync(SOURCE_PATH, "utf8");
    expect(source).not.toMatch(/from\s+["']node:/);
    expect(source).not.toMatch(/import\s+.*from\s+["']fs["']/);
    expect(source).not.toMatch(/import\s+.*from\s+["']crypto["']/);
  });

  it("uses discriminant type field for ClientMessage", () => {
    const source = fs.readFileSync(SOURCE_PATH, "utf8");
    // Each member of the union should have a `type` discriminant
    const clientMatches = source.match(/type:\s*["']design:[\w:]+["']/g);
    expect(clientMatches).not.toBeNull();
    expect(clientMatches!.length).toBeGreaterThanOrEqual(5);
  });

  it("uses discriminant type field for ServerMessage", () => {
    const source = fs.readFileSync(SOURCE_PATH, "utf8");
    const serverMatches = source.match(/type:\s*["']design:[\w:]+["']/g);
    expect(serverMatches).not.toBeNull();
    // Total type discriminants should cover both ClientMessage (5) + ServerMessage (6)
    expect(serverMatches!.length).toBeGreaterThanOrEqual(11);
  });
});
