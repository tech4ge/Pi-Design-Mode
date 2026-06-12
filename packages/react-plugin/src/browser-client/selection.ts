/**
 * Selection module for the Pi Design Mode browser client.
 *
 * Manages element selections (add, remove, clear, toggle).
 * Extracted from browser-client.ts for testability.
 */

interface SelectionDeps {
  applyHighlight: (sel: any) => void;
  clearHighlight: (sel: any) => void;
  reapplyAllHighlights: () => void;
  persistSelections: () => void;
}

export function createSelectionManager(deps: SelectionDeps) {
  const { applyHighlight, clearHighlight, reapplyAllHighlights, persistSelections } = deps;
  let selections: any[] = [];
  let sendMessage: { send(msg: any): void; isConnected(): boolean } | null = null;

  function setSendMessage(sm: { send(msg: any): void; isConnected(): boolean }) {
    sendMessage = sm;
  }

  function getSelections(): any[] {
    return selections;
  }

  function setSelections(s: any[]) {
    selections = s;
  }

  let _render: (() => void) | null = null;

  function setRender(r: () => void) { _render = r; }

  function addSelection(sel: any): boolean {
    const existing = selections.findIndex((s) => s.dataOid === sel.dataOid && s.instanceIndex === sel.instanceIndex);
    if (existing !== -1) {
      removeSelection(sel.dataOid, sel.instanceIndex);
      return false;
    }
    selections.push(sel);
    applyHighlight(sel);
    persistSelections();
    _render?.();
    return true;
  }

  function removeSelection(dataOid: string, instanceIndex?: number) {
    const removed = selections.filter((s) => {
      if (instanceIndex !== undefined) {
        return s.dataOid === dataOid && s.instanceIndex === instanceIndex;
      }
      return s.dataOid === dataOid;
    });
    selections = selections.filter((s) => {
      if (instanceIndex !== undefined) {
        return !(s.dataOid === dataOid && s.instanceIndex === instanceIndex);
      }
      return s.dataOid !== dataOid;
    });
    for (const sel of removed) clearHighlight(sel);
    sendMessage?.send({ type: "design:deselect", dataOid, instanceIndex });
    persistSelections();
    reapplyAllHighlights();
    _render?.();
  }

  function clearAllSelections() {
    for (const sel of selections) clearHighlight(sel);
    selections = [];
    sendMessage?.send({ type: "design:deselect", dataOid: "__all__" });
    persistSelections();
    _render?.();
  }

  return { getSelections, setSelections, addSelection, removeSelection, clearAllSelections, setSendMessage, setRender };
}
