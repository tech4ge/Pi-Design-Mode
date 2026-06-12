import { describe, it, expect } from "vitest";
import { buildSelectionData } from "../src/browser-client/click-handler.js";

describe("buildSelectionData", () => {
  it("builds selection data from a target element", () => {
    const target = {
      getAttribute: (name: string) => name === "data-oid" ? "c:abc:r:src/Foo.tsx:10:5" : null,
      tagName: "DIV",
      textContent: "Hello World",
    } as any;

    const result = buildSelectionData(target, {
      getSelector: (el: any) => "#my-div",
      getComputedStyles: (el: any) => ({ color: "red" }),
      getBoundingBox: (el: any) => ({ x: 10, y: 20, width: 100, height: 50 }),
    });

    expect(result.dataOid).toBe("c:abc:r:src/Foo.tsx:10:5");
    expect(result.tagName).toBe("div");
    expect(result.selector).toBe("#my-div");
    expect(result.textContent).toBe("Hello World");
    expect(result.boundingBox).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it("truncates textContent to 200 chars", () => {
    const longText = "x".repeat(300);
    const target = {
      getAttribute: () => "oid1",
      tagName: "SPAN",
      textContent: longText,
    } as any;

    const result = buildSelectionData(target, {
      getSelector: () => "span",
      getComputedStyles: () => ({}),
      getBoundingBox: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    });

    expect(result.textContent.length).toBe(200);
  });

  it("prefers data-oid over data-source", () => {
    const target = {
      getAttribute: (name: string) => name === "data-oid" ? "oid1" : name === "data-source" ? "src1" : null,
      tagName: "DIV",
      textContent: "",
    } as any;

    const result = buildSelectionData(target, {
      getSelector: () => "div",
      getComputedStyles: () => ({}),
      getBoundingBox: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    });

    expect(result.dataOid).toBe("oid1");
  });

  it("falls back to data-source when data-oid is missing", () => {
    const target = {
      getAttribute: (name: string) => name === "data-oid" ? null : name === "data-source" ? "src1" : null,
      tagName: "DIV",
      textContent: "",
    } as any;

    const result = buildSelectionData(target, {
      getSelector: () => "div",
      getComputedStyles: () => ({}),
      getBoundingBox: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    });

    expect(result.dataOid).toBe("src1");
  });
});
