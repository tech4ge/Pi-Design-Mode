import { describe, it, expect, beforeEach } from "vitest";
import { createSelectionManager } from "../src/browser-client/selection.js";

describe("createSelectionManager", () => {
  let sm: ReturnType<typeof createSelectionManager>;
  let sentMessages: any[];
  let highlighted: string[];
  let unhighlighted: string[];
  let rendered: number;

  beforeEach(() => {
    sentMessages = [];
    highlighted = [];
    unhighlighted = [];
    rendered = 0;
    sm = createSelectionManager({
      applyHighlight: (oid: string) => { highlighted.push(oid); },
      clearHighlight: (oid: string) => { unhighlighted.push(oid); },
      reapplyAllHighlights: () => {},
      persistSelections: () => {},
    });
    sm.setSendMessage({ send: (msg: any) => sentMessages.push(msg), isConnected: () => true });
    sm.setRender(() => { rendered++; });
  });

  it("addSelection adds an item", () => {
    expect(sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5" })).toBe(true);
    expect(sm.getSelections()).toHaveLength(1);
  });

  it("addSelection toggles off if already selected", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5" });
    expect(sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5" })).toBe(false);
    expect(sm.getSelections()).toHaveLength(0);
  });

  it("addSelection sends deselect when toggling off", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5" });
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5" });
    expect(sentMessages).toContainEqual({ type: "design:deselect", dataOid: "c:abc:r:src/Foo.tsx:10:5" });
  });

  it("removeSelection removes and sends deselect", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5" });
    sm.removeSelection("c:abc:r:src/Foo.tsx:10:5");
    expect(sm.getSelections()).toHaveLength(0);
    expect(sentMessages).toContainEqual({ type: "design:deselect", dataOid: "c:abc:r:src/Foo.tsx:10:5" });
  });

  it("clearAllSelections clears all and sends deselect __all__", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5" });
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:20:3" });
    sm.clearAllSelections();
    expect(sm.getSelections()).toHaveLength(0);
    expect(sentMessages).toContainEqual({ type: "design:deselect", dataOid: "__all__" });
  });

  it("clearAllSelections unhighlights all", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5" });
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:20:3" });
    sm.clearAllSelections();
    expect(unhighlighted).toContain("c:abc:r:src/Foo.tsx:10:5");
    expect(unhighlighted).toContain("c:abc:r:src/Foo.tsx:20:3");
  });

  it("addSelection highlights the item", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5" });
    expect(highlighted).toContain("c:abc:r:src/Foo.tsx:10:5");
  });

  it("addSelection renders after adding", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5" });
    expect(rendered).toBeGreaterThanOrEqual(1);
  });
});
