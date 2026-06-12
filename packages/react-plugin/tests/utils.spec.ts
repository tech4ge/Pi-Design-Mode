import { describe, it, expect } from "vitest";
import { escapeHtml, getSelector } from "../src/browser-client/utils.js";

describe("utils", () => {
  describe("escapeHtml", () => {
    it("escapes HTML special characters", () => {
      expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
      expect(escapeHtml("a&b")).toBe("a&amp;b");
      expect(escapeHtml('a"b')).toBe("a&quot;b");
    });

    it("returns empty string for empty input", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("leaves normal text unchanged", () => {
      expect(escapeHtml("hello world")).toBe("hello world");
    });
  });

  describe("getSelector", () => {
    it("returns ID selector when element has an id", () => {
      expect(getSelector({ id: "foo", tagName: "DIV" } as any)).toBe("#foo");
    });

    it("returns tag name when element has no id", () => {
      expect(getSelector({ id: "", tagName: "SPAN" } as any)).toBe("span");
    });
  });
});
