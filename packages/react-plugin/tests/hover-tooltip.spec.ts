import { describe, it, expect, beforeEach } from "vitest";
import { createHoverTooltip } from "../src/browser-client/hover-tooltip.js";

describe("createHoverTooltip", () => {
  let tooltip: ReturnType<typeof createHoverTooltip>;
  let createdElements: any[];

  const mockEscapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  beforeEach(() => {
    createdElements = [];
    tooltip = createHoverTooltip({
      document: {
        body: { appendChild: (el: any) => {} },
        createElement: (tag: string) => {
          const el = { tag, id: "", style: {} as Record<string, string>, innerHTML: "" };
          createdElements.push(el);
          return el as any;
        },
      } as any,
      escapeHtml: mockEscapeHtml,
    });
  });

  it("show creates tooltip element on first call", () => {
    tooltip.show("<div>", "src/Foo.tsx:10", 100, 200);
    expect(createdElements.length).toBe(1);
    expect(createdElements[0].id).toBe("pi-design-hover-tooltip");
  });

  it("show sets position from coordinates", () => {
    tooltip.show("<div>", "src/Foo.tsx:10", 100, 200);
    const el = createdElements[0];
    expect(el.style.left).toBe("112px");
    expect(el.style.top).toBe("212px");
  });

  it("hide does not throw even without prior show", () => {
    expect(() => tooltip.hide()).not.toThrow();
  });

  it("show reuses existing element on subsequent calls", () => {
    tooltip.show("<div>", "src/Foo.tsx:10", 100, 200);
    tooltip.show("<span>", "src/Bar.tsx:20", 300, 400);
    expect(createdElements.length).toBe(1); // Only one element created
    expect(createdElements[0].style.left).toBe("312px");
  });
});
