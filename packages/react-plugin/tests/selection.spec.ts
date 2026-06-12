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
    expect(sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 })).toBe(true);
    expect(sm.getSelections()).toHaveLength(1);
  });

  it("addSelection toggles off if same dataOid + instanceIndex", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    expect(sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 })).toBe(false);
    expect(sm.getSelections()).toHaveLength(0);
  });

  it("addSelection allows same dataOid with different instanceIndex", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 2 });
    expect(sm.getSelections()).toHaveLength(2);
  });

  it("addSelection sends deselect when toggling off", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    expect(sentMessages).toContainEqual({ type: "design:deselect", dataOid: "c:abc:r:src/Foo.tsx:10:5" });
  });

  it("removeSelection removes by dataOid + instanceIndex", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 1 });
    sm.removeSelection("c:abc:r:src/Foo.tsx:10:5", 0);
    expect(sm.getSelections()).toHaveLength(1);
    expect(sm.getSelections()[0].instanceIndex).toBe(1);
  });

  it("removeSelection removes all matching dataOid when instanceIndex omitted", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 1 });
    sm.removeSelection("c:abc:r:src/Foo.tsx:10:5");
    expect(sm.getSelections()).toHaveLength(0);
  });

  it("removeSelection sends deselect", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    sm.removeSelection("c:abc:r:src/Foo.tsx:10:5", 0);
    expect(sentMessages).toContainEqual({ type: "design:deselect", dataOid: "c:abc:r:src/Foo.tsx:10:5" });
  });

  it("clearAllSelections clears all and sends deselect __all__", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:20:3", instanceIndex: 0 });
    sm.clearAllSelections();
    expect(sm.getSelections()).toHaveLength(0);
    expect(sentMessages).toContainEqual({ type: "design:deselect", dataOid: "__all__" });
  });

  it("clearAllSelections unhighlights all", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:20:3", instanceIndex: 0 });
    sm.clearAllSelections();
    expect(unhighlighted).toContain("c:abc:r:src/Foo.tsx:10:5");
    expect(unhighlighted).toContain("c:abc:r:src/Foo.tsx:20:3");
  });

  it("addSelection highlights the item", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    expect(highlighted).toContain("c:abc:r:src/Foo.tsx:10:5");
  });

  it("addSelection renders after adding", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    expect(rendered).toBeGreaterThanOrEqual(1);
  });
});
