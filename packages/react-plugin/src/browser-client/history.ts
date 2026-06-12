/**
 * History module for the Pi Design Mode browser client.
 *
 * Manages instruction history in localStorage.
 * Extracted from browser-client.ts for testability.
 */

interface HistoryDeps {
  localStorage: Storage;
  input: { value: string; focus: () => void };
  historyDropdown: {
    innerHTML: string;
    appendChild: (el: Element) => void;
    querySelector: (sel: string) => Element | null;
  };
  createElement?: (tag: string) => Element;
}

const STORAGE_KEY = "pi-design-history";
const MAX_ENTRIES = 20;

export function createHistory(deps: HistoryDeps) {
  const { localStorage: storage, input, historyDropdown } = deps;

  function getHistory(): string[] {
    try {
      const h = storage.getItem(STORAGE_KEY);
      return h ? JSON.parse(h) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(instruction: string) {
    if (!instruction.trim()) return;
    let h = getHistory();
    h = h.filter((x) => x !== instruction);
    h.unshift(instruction);
    if (h.length > MAX_ENTRIES) h = h.slice(0, MAX_ENTRIES);
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(h));
    } catch {}
  }

  function showHistory() {
    const h = getHistory();
    if (h.length === 0 || input.value.length > 0) {
      if ("style" in historyDropdown) {
        (historyDropdown as any).style.display = "none";
      }
      return;
    }
    // Clear dropdown
    const title = historyDropdown.querySelector(".history-panel-title");
    historyDropdown.innerHTML = "";
    if (title) historyDropdown.appendChild(title);

    for (const instr of h) {
      const item = (deps.createElement ?? document.createElement.bind(document))("div");
      item.className = "history-item";
      item.textContent = instr;
      historyDropdown.appendChild(item);
    }

    const clearEl = (deps.createElement ?? document.createElement.bind(document))("div");
    clearEl.className = "history-clear";
    clearEl.textContent = "Clear history";
    historyDropdown.appendChild(clearEl);

    if ("style" in historyDropdown) {
      (historyDropdown as any).style.display = "flex";
    }
  }

  function clearHistory() {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {}
  }

  return { getHistory, saveHistory, showHistory, clearHistory };
}
