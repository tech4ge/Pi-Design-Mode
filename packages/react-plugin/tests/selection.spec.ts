import { describe, it, expect, beforeEach } from "vitest";
import { createSelectionManager } from "../src/browser-client/selection.js";

describe("createSelectionManager", () => {
  let sm: ReturnType<typeof createSelectionManager>;
  let sentMessages: any[];
  let highlighted: any[];
  let unhighlighted: any[];
  let rendered: number;

  beforeEach(() => {
    sentMessages = [];
    highlighted = [];
    unhighlighted = [];
    rendered = 0;
    sm = createSelectionManager({
      applyHighlight: (sel: any) => { highlighted.push(sel); },
      clearHighlight: (sel: any) => { unhighlighted.push(sel); },
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

  it("addSelection passes full selection to applyHighlight", () => {
    const sel = { dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 2, tagName: "input" };
    sm.addSelection(sel);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].instanceIndex).toBe(2);
    expect(highlighted[0].tagName).toBe("input");
  });

  it("removeSelection clears highlight with full selection object", () => {
    const sel = { dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 };
    sm.addSelection(sel);
    sm.removeSelection("c:abc:r:src/Foo.tsx:10:5", 0);
    expect(unhighlighted).toHaveLength(1);
    expect(unhighlighted[0].instanceIndex).toBe(0);
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

  it("clearAllSelections clears all and sends deselect __all__", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:20:3", instanceIndex: 0 });
    sm.clearAllSelections();
    expect(sm.getSelections()).toHaveLength(0);
    expect(sentMessages).toContainEqual({ type: "design:deselect", dataOid: "__all__" });
  });

  it("clearAllSelections unhighlights all with full selection objects", () => {
    const sel0 = { dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 };
    const sel1 = { dataOid: "c:abc:r:src/Foo.tsx:20:3", instanceIndex: 0 };
    sm.addSelection(sel0);
    sm.addSelection(sel1);
    sm.clearAllSelections();
    expect(unhighlighted).toHaveLength(2);
    expect(unhighlighted[0].dataOid).toBe("c:abc:r:src/Foo.tsx:10:5");
    expect(unhighlighted[1].dataOid).toBe("c:abc:r:src/Foo.tsx:20:3");
  });

  it("addSelection sends deselect when toggling off", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    expect(sentMessages).toContainEqual({ type: "design:deselect", dataOid: "c:abc:r:src/Foo.tsx:10:5" });
  });

  it("addSelection renders after adding", () => {
    sm.addSelection({ dataOid: "c:abc:r:src/Foo.tsx:10:5", instanceIndex: 0 });
    expect(rendered).toBeGreaterThanOrEqual(1);
  });
});
