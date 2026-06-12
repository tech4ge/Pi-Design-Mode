import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SOURCE_PATH = path.resolve(__dirname, "../src/next.tsx");

describe("PiDesignClient", () => {
  it("uses useEffect to import browser-client (not top-level)", () => {
    const source = fs.readFileSync(SOURCE_PATH, "utf8");
    // Must import useEffect from react
    expect(source).toMatch(/import\s*\{[^}]*useEffect[^}]*\}\s*from\s*["']react["']/);
    // Must wrap the import in useEffect
    expect(source).toMatch(/useEffect\s*\(\s*\(\)\s*=>\s*\{/);
    // Dynamic import must be inside useEffect, not at top level of component
    const useEffectBlock = source.match(/useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[\]\s*\)/);
    expect(useEffectBlock).not.toBeNull();
    expect(useEffectBlock![0]).toContain("import(");
  });

  it("keeps production guard inside useEffect", () => {
    const source = fs.readFileSync(SOURCE_PATH, "utf8");
    const useEffectBlock = source.match(/useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[\]\s*\)/);
    expect(useEffectBlock).not.toBeNull();
    expect(useEffectBlock![0]).toContain("process.env.NODE_ENV");
  });

  it("returns null", () => {
    const source = fs.readFileSync(SOURCE_PATH, "utf8");
    expect(source).toMatch(/return\s+null/);
  });

  it("still has 'use client' directive", () => {
    const source = fs.readFileSync(SOURCE_PATH, "utf8");
    expect(source.startsWith('"use client"')).toBe(true);
  });
});
