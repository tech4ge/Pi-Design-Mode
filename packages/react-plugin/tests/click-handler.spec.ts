import { describe, it, expect } from "vitest";
import { buildSelectionData } from "../src/browser-client/click-handler.js";

function mkTarget(overrides: Record<string, any> = {}) {
  return {
    getAttribute: (name: string) => name === "data-oid" ? "c:abc:r:src/Foo.tsx:10:5" : null,
    tagName: "DIV",
    textContent: "Hello World",
    parentElement: null,
    ...overrides,
  } as any;
}

function mkDeps(overrides: Record<string, any> = {}) {
  return {
    getSelector: () => "#my-div",
    getComputedStyles: () => ({ color: "red" }),
    getBoundingBox: () => ({ x: 10, y: 20, width: 100, height: 50 }),
    querySelectorAll: () => [],
    bodyElement: null,
    ...overrides,
  };
}

describe("buildSelectionData", () => {
  it("builds selection data from a target element", () => {
    const target = mkTarget();
    const result = buildSelectionData(target, mkDeps());

    expect(result.dataOid).toBe("c:abc:r:src/Foo.tsx:10:5");
    expect(result.tagName).toBe("div");
    expect(result.selector).toBe("#my-div");
    expect(result.textContent).toBe("Hello World");
    expect(result.boundingBox).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it("truncates textContent to 200 chars", () => {
    const longText = "x".repeat(300);
    const target = mkTarget({ textContent: longText });

    const result = buildSelectionData(target, mkDeps({ getSelector: () => "span" }));

    expect(result.textContent.length).toBe(200);
  });

  it("prefers data-oid over data-source", () => {
    const target = mkTarget({
      getAttribute: (name: string) => name === "data-oid" ? "oid1" : name === "data-source" ? "src1" : null,
    });

    const result = buildSelectionData(target, mkDeps());

    expect(result.dataOid).toBe("oid1");
  });

  it("falls back to data-source when data-oid is missing", () => {
    const target = mkTarget({
      getAttribute: (name: string) => name === "data-oid" ? null : name === "data-source" ? "src1" : null,
    });

    const result = buildSelectionData(target, mkDeps());

    expect(result.dataOid).toBe("src1");
  });

  it("includes instanceIndex from getInstanceIndex", () => {
    const el = mkTarget();
    const result = buildSelectionData(el, mkDeps({
      querySelectorAll: () => [{} as Element, {} as Element, el],
    }));

    expect(result.instanceIndex).toBe(2);
  });

  it("includes WeakRef to the target element", () => {
    const el = mkTarget();
    const result = buildSelectionData(el, mkDeps());

    expect(result.elementRef).toBeInstanceOf(WeakRef);
    expect(result.elementRef.deref()).toBe(el);
  });

  it("includes structuralSelector when bodyElement is provided", () => {
    const body = mkElementWithAttrs("body");
    const div = mkElementWithAttrs("div", body);
    const span = mkElementWithAttrs("span", div);

    const result = buildSelectionData(span as any, mkDeps({ bodyElement: body }));

    expect(result.structuralSelector).toBe("div > span");
  });

  it("returns empty structuralSelector when bodyElement is null", () => {
    const target = mkTarget();
    const result = buildSelectionData(target, mkDeps({ bodyElement: null }));

    expect(result.structuralSelector).toBe("");
  });
});

/** Mock element with getAttribute support for click-handler tests. */
function mkElementWithAttrs(tag: string, parent?: Element): Element {
  const children: Element[] = [];
  const el = {
    tagName: tag.toUpperCase(),
    parentElement: parent ?? null,
    getAttribute: () => null,
    textContent: "",
    get children() {
      return children as any as HTMLCollection;
    },
  } as unknown as Element;
  if (parent) {
    const parentChildren = (parent as any).__childrenArr as Element[] | undefined;
    if (parentChildren) {
      parentChildren.push(el);
    }
  }
  Object.defineProperty(el, "__childrenArr", { value: children, enumerable: false });
  return el;
}
