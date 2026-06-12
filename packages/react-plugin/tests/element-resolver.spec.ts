import { describe, it, expect } from "vitest";
import { getInstanceIndex, computeStructuralSelector, resolveElement } from "../src/browser-client/element-resolver.js";

describe("getInstanceIndex", () => {
  it("returns 0 for sole element with a dataOid", () => {
    const element = {} as Element;
    const querySelectorAll = () => [element];

    expect(getInstanceIndex(element, "oid1", querySelectorAll)).toBe(0);
  });

  it("returns correct index for Nth element among duplicates", () => {
    const el0 = {} as Element;
    const el1 = {} as Element;
    const el2 = {} as Element;
    const querySelectorAll = () => [el0, el1, el2];

    expect(getInstanceIndex(el2, "oid1", querySelectorAll)).toBe(2);
  });
});

describe("computeStructuralSelector", () => {
  it("produces a unique path for a simple element", () => {
    const body = mkElement("body");
    const div = mkElement("div", body);
    const span = mkElement("span", div);

    expect(computeStructuralSelector(span, body)).toBe("div > span");
  });

  it("uses nth-child when siblings share the same tag", () => {
    const body = mkElement("body");
    const div = mkElement("div", body);
    mkElement("span", div);
    const s2 = mkElement("span", div);
    mkElement("p", div);

    // s2 is the 2nd child (overall), 2nd span
    expect(computeStructuralSelector(s2, body)).toBe("div > span:nth-child(2)");
  });

  it("produces different selectors for distinct sibling elements", () => {
    const body = mkElement("body");
    const div = mkElement("div", body);
    const s1 = mkElement("span", div);
    const s2 = mkElement("span", div);
    const s3 = mkElement("span", div);

    const sel1 = computeStructuralSelector(s1, body);
    const sel2 = computeStructuralSelector(s2, body);
    const sel3 = computeStructuralSelector(s3, body);

    expect(sel1).not.toBe(sel2);
    expect(sel2).not.toBe(sel3);
    expect(sel1).not.toBe(sel3);
  });

  it("stops walking at body", () => {
    const html = mkElement("html");
    const body = mkElement("body", html);
    const div = mkElement("div", body);

    // Should not include body or html
    expect(computeStructuralSelector(div, body)).toBe("div");
  });

  it("handles deeply nested elements", () => {
    const body = mkElement("body");
    const nav = mkElement("nav", body);
    const ul = mkElement("ul", nav);
    const li = mkElement("li", ul);
    const a = mkElement("a", li);

    expect(computeStructuralSelector(a, body)).toBe("nav > ul > li > a");
  });
});

describe("resolveElement", () => {
  it("returns WeakRef.deref() result when ref is alive and connected", () => {
    const el = mkConnectedElement();
    const ref = new WeakRef(el);
    const selection = { dataOid: "oid1", instanceIndex: 0, elementRef: ref, structuralSelector: "" };

    const result = resolveElement(selection, () => [], () => null);
    expect(result).toBe(el);
  });

  it("falls back to querySelectorAll + instanceIndex when WeakRef is stale", () => {
    const el0 = {} as Element;
    const el1 = {} as Element;
    const el2 = {} as Element;

    // WeakRef returns a disconnected element
    const ref = new WeakRef({ isConnected: false } as Element);
    const selection = { dataOid: "oid1", instanceIndex: 2, elementRef: ref, structuralSelector: "" };

    const result = resolveElement(selection, () => [el0, el1, el2], () => null);
    expect(result).toBe(el2);
  });

  it("falls back to structural selector when index resolution fails", () => {
    const el = {} as Element;
    const ref = new WeakRef({ isConnected: false } as Element);
    const selection = { dataOid: "oid1", instanceIndex: 99, elementRef: ref, structuralSelector: "div > span:nth-child(3)" };

    const result = resolveElement(selection, () => [], (s: string) => s === "div > span:nth-child(3)" ? el : null);
    expect(result).toBe(el);
  });

  it("returns null when all resolution paths fail", () => {
    const ref = new WeakRef({ isConnected: false } as Element);
    const selection = { dataOid: "oid1", instanceIndex: 99, elementRef: ref, structuralSelector: "div > span" };

    const result = resolveElement(selection, () => [], () => null);
    expect(result).toBeNull();
  });

  it("returns null when WeakRef element is disconnected", () => {
    const el = mkDisconnectedElement();
    const ref = new WeakRef(el);
    const selection = { dataOid: "oid1", instanceIndex: 0, elementRef: ref, structuralSelector: "" };

    const result = resolveElement(selection, () => [], () => null);
    expect(result).toBeNull();
  });
});

/** Build a mock Element tree. */
function mkElement(tag: string, parent?: Element): Element {
  const children: Element[] = [];
  const el = {
    tagName: tag.toUpperCase(),
    parentElement: parent ?? null,
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

function mkConnectedElement(): Element {
  return { isConnected: true } as Element;
}

function mkDisconnectedElement(): Element {
  return { isConnected: false } as Element;
}
