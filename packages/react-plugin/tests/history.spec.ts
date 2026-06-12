import { describe, it, expect, beforeEach } from "vitest";
import { createHistory } from "../src/browser-client/history.js";

// jsdom-like mock for localStorage
function mockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  };
}

describe("createHistory", () => {
  let history: ReturnType<typeof createHistory>;
  let storage: ReturnType<typeof mockStorage>;
  let renderedItems: string[];

  function mockCreateElement(tag: string) {
    return {
      tag,
      className: "",
      textContent: "",
      set textContent(v: string) { (this as any)._textContent = v; },
      get textContent() { return (this as any)._textContent ?? ""; },
    } as unknown as Element;
  }

  beforeEach(() => {
    storage = mockStorage();
    renderedItems = [];
    const mockDropdown = {
      innerHTML: "",
      appendChild: (el: Element) => { renderedItems.push(el.textContent || ""); },
      querySelector: () => ({ remove: () => {} }),
    };
    history = createHistory({
      localStorage: storage as unknown as Storage,
      input: { value: "", focus: () => {} } as any,
      historyDropdown: mockDropdown as any,
      createElement: mockCreateElement as any,
    });
  });

  it("getHistory returns empty array when nothing stored", () => {
    expect(history.getHistory()).toEqual([]);
  });

  it("saveHistory stores instruction", () => {
    history.saveHistory("make it blue");
    expect(history.getHistory()).toEqual(["make it blue"]);
  });

  it("saveHistory deduplicates", () => {
    history.saveHistory("make it blue");
    history.saveHistory("center it");
    history.saveHistory("make it blue");
    expect(history.getHistory()).toEqual(["make it blue", "center it"]);
  });

  it("saveHistory caps at 20 entries", () => {
    for (let i = 0; i < 25; i++) {
      history.saveHistory(`instruction ${i}`);
    }
    expect(history.getHistory().length).toBe(20);
    expect(history.getHistory()[0]).toBe("instruction 24");
  });

  it("saveHistory ignores empty strings", () => {
    history.saveHistory("");
    history.saveHistory("   ");
    expect(history.getHistory()).toEqual([]);
  });

  it("showHistory populates dropdown when input is empty and history exists", () => {
    history.saveHistory("make it blue");
    history.showHistory();
    expect(renderedItems.length).toBeGreaterThanOrEqual(1);
  });

  it("showHistory returns early when input has value", () => {
    const storage2 = mockStorage();
    const input2 = { value: "existing text", focus: () => {} };
    let appended = false;
    const history2 = createHistory({
      localStorage: storage2 as unknown as Storage,
      input: input2 as any,
      historyDropdown: { innerHTML: "", appendChild: () => { appended = true; }, querySelector: () => null } as any,
      createElement: mockCreateElement as any,
    });
    history2.saveHistory("make it blue");
    history2.showHistory();
    expect(appended).toBe(false);
  });

  it("clearHistory removes stored entries", () => {
    history.saveHistory("make it blue");
    history.saveHistory("center it");
    expect(history.getHistory()).toHaveLength(2);
    history.clearHistory();
    expect(history.getHistory()).toEqual([]);
  });
});
