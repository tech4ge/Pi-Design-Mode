import { parseDataOid } from "./data-oid/shared.js";
import { reconnectPolicy } from "./reconnect-policy.js";
import type { ClientMessage, ServerMessage } from "./protocol.js";
import { createHistory } from "./browser-client/history.js";
import { createHoverTooltip } from "./browser-client/hover-tooltip.js";
import { createSelectionManager } from "./browser-client/selection.js";
import { buildSelectionData } from "./browser-client/click-handler.js";
import { routeServerMessage } from "./browser-client/connection.js";

// Pi Design Mode — Browser Client
//
// Single source of truth for the browser client runtime.
// Built by tsup to dist/browser-client.js as a self-executing IIFE.
// Consumed by:
//   - Vite: readFileSync('dist/browser-client.js') served as virtual module
//   - Next.js: import "@pi-design/react-plugin/browser-client" (side-effect)

if (typeof window !== "undefined" && !(window as any).__piDesignInit) {
  (window as any).__piDesignInit = true;

  const WS_PORT = (window as any).__PI_DESIGN_PORT || 9481;
  const SELECTION_COLORS = ["#f38ba8", "#a6e3a1", "#89b4fa", "#f9e2af", "#cba6f7", "#94e2d5", "#fab387", "#74c7ec"];

  let isAltDown = false;
  let isConnected = false;
  let isProcessing = false;
  let lastSelections: any[] = [];
  let submittedOids: string[] = [];
  let processingTimer: ReturnType<typeof setTimeout> | null = null;
  let errorBannerTimer: ReturnType<typeof setTimeout> | null = null;
  let restoreObserver: MutationObserver | null = null;
  let reconnectAttempt = 0;

  // Forward-declared — instantiated after highlight/render functions are defined
  let selectionMod: ReturnType<typeof createSelectionManager>;

  document.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Alt") isAltDown = true; });
  document.addEventListener("keyup", (e: KeyboardEvent) => { if (e.key === "Alt") { isAltDown = false; hideHoverTooltip(); } });
  document.addEventListener("blur", () => { isAltDown = false; hideHoverTooltip(); });

  // --- Core utilities ---

  function findByOid(value: string): Element | null {
    return document.querySelector(`[data-oid="${CSS.escape(value)}"]`) ||
           document.querySelector(`[data-source="${CSS.escape(value)}"]`);
  }

  // parseDataOid is imported from data-oid/shared at the top of this module.
  // tsup inlines it into the IIFE — no runtime import.

  function getSelector(element: Element): string {
    if (element.id) return "#" + element.id;
    return element.tagName.toLowerCase();
  }

  function computeStructuralContext() {
    if (selectionMod.getSelections().length <= 1) return { siblings: [] as string[][], sameComponent: [] as string[][] };
    const oids = selectionMod.getSelections().map((s) => s.dataOid);
    const parentMap = new Map<Element, string[]>();
    for (const oid of oids) {
      const el = findByOid(oid);
      if (el && el.parentElement) {
        if (!parentMap.has(el.parentElement)) parentMap.set(el.parentElement, []);
        parentMap.get(el.parentElement)!.push(oid);
      }
    }
    const siblings: string[][] = [];
    parentMap.forEach((group) => { if (group.length > 1) siblings.push(group); });
    const fileMap: Record<string, string[]> = {};
    for (const oid of oids) {
      const parsed = parseDataOid(oid);
      const fileKey = parsed ? parsed.filePath : oid;
      if (!fileMap[fileKey]) fileMap[fileKey] = [];
      fileMap[fileKey].push(oid);
    }
    const sameComponent: string[][] = [];
    for (const key of Object.keys(fileMap)) {
      if (fileMap[key].length > 1) sameComponent.push(fileMap[key]);
    }
    return { siblings, sameComponent };
  }

  function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function getComputedStyles(element: Element) {
    const styles = window.getComputedStyle(element);
    const relevant = ["background-color", "color", "font-size", "font-family", "padding", "margin", "border-radius", "display", "width", "height", "gap", "flex-direction"];
    const result: Record<string, string> = {};
    for (const prop of relevant) result[prop] = styles.getPropertyValue(prop);
    return result;
  }

  function getBoundingBox(element: Element) {
    const rect = element.getBoundingClientRect();
    return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
  }

  function persistSelections() {
    try {
      if (selectionMod.getSelections().length > 0) sessionStorage.setItem("pi-design-selections", JSON.stringify(selectionMod.getSelections()));
      else sessionStorage.removeItem("pi-design-selections");
    } catch {}
  }

  function restoreSelections() {
    try {
      const saved = sessionStorage.getItem("pi-design-selections");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0 || selectionMod.getSelections().length > 0) return;

      // First pass — restore what we can now
      applyRestoredSelections(parsed);
    } catch {}
  }

  function applyRestoredSelections(saved: any[]) {
    let found = 0;
    for (const s of saved) {
      if (selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid) >= 0) continue;
      const el = findByOid(s.dataOid);
      if (!el) continue;
      selectionMod.getSelections().push(s);
      applyHighlight(s.dataOid, SELECTION_COLORS[(selectionMod.getSelections().length - 1) % SELECTION_COLORS.length]);
      found++;
    }
    if (found > 0) {
      render();
      if (found >= saved.length) return;
    }

    // Some elements not in DOM yet — watch for them via MutationObserver
    const missingOids = saved.filter(
      (s) => selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid) < 0,
    );
    if (missingOids.length === 0) return;

    restoreObserver = new MutationObserver(() => {
      const stillMissing = missingOids.filter(
        (s) => selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid) < 0 && !findByOid(s.dataOid),
      );
      if (stillMissing.length === missingOids.length) return; // no change yet

      // At least one element appeared — try restoring again
      const nowFound = missingOids.filter(
        (s) => selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid) < 0 && findByOid(s.dataOid) !== null,
      );
      for (const s of nowFound) {
        selectionMod.getSelections().push(s);
        applyHighlight(s.dataOid, SELECTION_COLORS[(selectionMod.getSelections().length - 1) % SELECTION_COLORS.length]);
      }
      render();

      // All restored?
      const remaining = missingOids.filter(
        (s) => selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid) < 0,
      );
      if (remaining.length === 0) {
        restoreObserver?.disconnect();
        restoreObserver = null;
      }
    });
    restoreObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
    // Safety: stop watching after 10s regardless
    setTimeout(() => { restoreObserver?.disconnect(); restoreObserver = null; }, 10000);
  }

  let historyMod = createHistory({ localStorage, input: null as any, historyDropdown: null as any });

  // --- WebSocket ---

  let ws: WebSocket | null = null;

  function connectWS(sendMessage: { send(msg: ClientMessage): void; isConnected(): boolean }) {
    ws = new WebSocket(`ws://localhost:${WS_PORT}`);
    ws.onopen = () => {
      isConnected = true;
      reconnectAttempt = 0; // Reset on successful connection
      sendMessage.send({ type: "design:connect", url: window.location.href, title: document.title });
      if ((window as any).__piDesignWidget) {
        (window as any).__piDesignWidget.updateConnection(true);
      } else {
        createWidget(sendMessage);
      }
    };
    ws.onclose = () => {
      isConnected = false;
      const policy = reconnectPolicy(reconnectAttempt);
      if ("giveUp" in policy) {
        if ((window as any).__piDesignWidget) {
          (window as any).__piDesignWidget.updateConnection(false);
          (window as any).__piDesignWidget.showError("Disconnected — run /design to restart", true);
        }
        return;
      }
      reconnectAttempt++;
      if ((window as any).__piDesignWidget) {
        (window as any).__piDesignWidget.updateConnection(false);
        (window as any).__piDesignWidget.showError("Connection lost — retrying");
      }
      setTimeout(() => connectWS(sendMessage), policy.delay);
    };
    ws.onerror = () => {};
    ws.onmessage = (event) => {
      try { handleServerMessage(JSON.parse(event.data), sendMessage); } catch {}
    };
  }

  function handleServerMessage(message: ServerMessage, sendMessage: { send(msg: ClientMessage): void; isConnected(): boolean }) {
    routeServerMessage(message, {
      onDisconnect: () => disconnect(sendMessage),
      onHighlight: (oid) => highlightElement(oid),
      onProcessing: (v) => { if ((window as any).__piDesignWidget) (window as any).__piDesignWidget.setProcessing(v); },
      onDone: () => {
        if ((window as any).__piDesignWidget) (window as any).__piDesignWidget.setProcessing(false);
        if ((window as any).__piDesignWidget) (window as any).__piDesignWidget.flashEditedElements();
        if ((window as any).__piDesignWidget) (window as any).__piDesignWidget.showSuccess();
      },
      onError: (msg) => {
        if ((window as any).__piDesignWidget) (window as any).__piDesignWidget.setProcessing(false);
        if ((window as any).__piDesignWidget) (window as any).__piDesignWidget.showError(msg);
      },
    });
  }

  // --- Selection management ---

  function applyHighlight(dataOid: string, color: string) {
    const el = findByOid(dataOid);
    if (el) {
      (el as HTMLElement).style.outline = `2px solid ${color}`;
      (el as HTMLElement).style.outlineOffset = "2px";
      el.setAttribute("data-pi-highlighted", "true");
    }
  }

  function clearHighlight(dataOid: string) {
    const el = findByOid(dataOid);
    if (el) {
      (el as HTMLElement).style.outline = "";
      (el as HTMLElement).style.outlineOffset = "";
      el.removeAttribute("data-pi-highlighted");
    }
  }

  function reapplyAllHighlights() {
    const highlighted = document.querySelectorAll("[data-pi-highlighted]");
    for (const el of highlighted) {
      (el as HTMLElement).style.outline = "";
      (el as HTMLElement).style.outlineOffset = "";
      el.removeAttribute("data-pi-highlighted");
    }
    for (let i = 0; i < selectionMod.getSelections().length; i++) {
      applyHighlight(selectionMod.getSelections()[i].dataOid, SELECTION_COLORS[i % SELECTION_COLORS.length]);
    }
  }

  // --- Selection module (instantiated after highlight functions) ---
  selectionMod = createSelectionManager({
    applyHighlight: (dataOid: string) => applyHighlight(dataOid, SELECTION_COLORS[selectionMod.getSelections().length % SELECTION_COLORS.length]),
    clearHighlight,
    reapplyAllHighlights,
    persistSelections,
  });

  function addSelection(sel: any, sendMessage: { send(msg: ClientMessage): void; isConnected(): boolean }) {
    selectionMod.setSendMessage(sendMessage);
    return selectionMod.addSelection(sel);
  }

  function removeSelection(dataOid: string, sendMessage: { send(msg: ClientMessage): void; isConnected(): boolean }) {
    selectionMod.setSendMessage(sendMessage);
    selectionMod.removeSelection(dataOid);
  }

  function clearAllSelections(sendMessage: { send(msg: ClientMessage): void; isConnected(): boolean }) {
    selectionMod.setSendMessage(sendMessage);
    selectionMod.clearAllSelections();
  }

  function flashElement(dataOid: string) {
    const el = findByOid(dataOid);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const orig = (el as HTMLElement).style.outlineOffset;
    (el as HTMLElement).style.transition = "outline-offset 0.15s ease";
    (el as HTMLElement).style.outlineOffset = "8px";
    setTimeout(() => {
      (el as HTMLElement).style.outlineOffset = orig || "2px";
      setTimeout(() => { (el as HTMLElement).style.transition = ""; }, 200);
    }, 200);
  }

  // --- Widget ---

  const WIDGET_ID = "pi-design-widget";
  let widgetHost: HTMLElement | null = null;
  let shadow: ShadowRoot;
  let dot: HTMLElement;
  let closeBtn: HTMLElement;
  let selectionsContainer: HTMLElement;
  let input: HTMLTextAreaElement;
  let submitBtn: HTMLButtonElement;
  let processingEl: HTMLElement;
  let errorBanner: HTMLElement;
  let errorMsg: HTMLElement;
  let historyDropdown: HTMLElement;
  let cancelBtn: HTMLElement;
  let quickActions: HTMLElement;
  let qaMultiBtns: NodeListOf<Element>;
  let hint: HTMLElement;

  function createWidget(sendMessage: { send(msg: ClientMessage): void; isConnected(): boolean }) {
    if (document.getElementById(WIDGET_ID)) return;
    widgetHost = document.createElement("div");
    widgetHost.id = WIDGET_ID;
    widgetHost.style.cssText = "position:fixed;bottom:16px;right:16px;z-index:999999;font-family:system-ui,sans-serif;";
    document.body.appendChild(widgetHost);
    shadow = widgetHost.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; font-family: system-ui, -apple-system, sans-serif; }
      .widget { background: #1e1e2e; border: 1px solid #45475a; border-radius: 12px; padding: 12px; min-width: 300px; max-width: 420px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); color: #cdd6f4; font-size: 13px; transition: min-width 0.2s ease; position: relative; }
      .widget.expanded { min-width: 380px; }
      .header { display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 8px; font-size: 14px; }
      .header .title { flex: 1; display: flex; align-items: center; gap: 6px; }
      .close-btn { background: none; border: none; color: #6c7086; cursor: pointer; padding: 2px 6px; font-size: 16px; border-radius: 4px; line-height: 1; }
      .close-btn:hover { color: #cdd6f4; background: #313244; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: #f38ba8; display: inline-block; }
      .dot.connected { background: #a6e3a1; }
      .selections { max-height: 180px; overflow-y: auto; margin-bottom: 8px; }
      .color-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; margin-right: 3px; }
      .selection-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: #313244; border-radius: 6px; margin-bottom: 4px; font-size: 12px; cursor: pointer; transition: background 0.1s; }
      .selection-item:hover { background: #45475a; }
      .selection-item .tag { color: #89b4fa; font-family: monospace; }
      .selection-item .file { color: #a6adc8; flex: 1; margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .selection-item .remove { background: none; border: none; color: #f38ba8; cursor: pointer; padding: 0 4px; font-size: 14px; }
      .selection-item .remove:hover { color: #eba0ac; }
      .input-row { display: flex; gap: 6px; align-items: flex-end; }
      .input-row textarea { flex: 1; background: #313244; border: 1px solid #45475a; border-radius: 6px; padding: 6px 8px; color: #cdd6f4; font-size: 13px; outline: none; resize: none; overflow-y: auto; max-height: 120px; line-height: 1.4; font-family: inherit; }
      .input-row textarea:focus { border-color: #89b4fa; }
      .submit-btn { background: #89b4fa; color: #1e1e2e; border: none; border-radius: 6px; padding: 6px 12px; font-weight: 600; cursor: pointer; font-size: 13px; }
      .submit-btn:hover { background: #b4d0fb; }
      .submit-btn:disabled { background: #45475a; color: #6c7086; cursor: not-allowed; }
      .processing { color: #f9e2af; font-size: 12px; text-align: center; margin-top: 6px; }
      .processing .cancel { background: none; border: none; color: #f9e2af; cursor: pointer; text-decoration: underline; font-size: 12px; padding: 0; margin-left: 4px; }
      .error-banner { background: #45475a; color: #f38ba8; font-size: 12px; padding: 6px 8px; border-radius: 6px; margin-bottom: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
      .hint { color: #6c7086; font-size: 11px; margin-top: 6px; }
      .quick-actions { display: none; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
      .qa-btn { background: #313244; color: #cdd6f4; border: 1px solid #45475a; border-radius: 12px; padding: 2px 10px; font-size: 11px; cursor: pointer; }
      .qa-btn:hover { background: #45475a; border-color: #89b4fa; }
      .qa-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .history-panel { position: absolute; top: 8px; right: calc(100% - 1px); bottom: 8px; width: 200px; background: #1e1e2e; border: 1px solid #45475a; border-right: none; border-radius: 12px 0 0 12px; padding: 8px 0; overflow-y: auto; display: none; flex-direction: column; box-shadow: -4px 4px 16px rgba(0,0,0,0.2); }
      .history-panel-title { padding: 4px 10px 8px; font-size: 11px; color: #6c7086; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
      .history-item { padding: 6px 10px; font-size: 12px; line-height: 1.4; color: #cdd6f4; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
      .history-item:hover { background: #313244; }
      .history-clear { padding: 8px 10px; font-size: 11px; color: #f38ba8; cursor: pointer; text-align: center; border-top: 1px solid #313244; margin-top: auto; }
      .history-clear:hover { background: #313244; }
    `;

    const widget = document.createElement("div");
    widget.className = "widget";
    widget.innerHTML = `
      <div class="header"><div class="title"><span class="dot"></span> Pi Design Mode</div><button class="close-btn" title="Close design mode">✕</button></div>
      <div class="error-banner" style="display:none">⚠️ <span class="error-msg"></span></div>
      <div class="selections"></div>
      <div class="input-row">
        <textarea rows="1" placeholder="Describe the change..."></textarea>
        <button class="submit-btn">Submit</button>
      </div>
      <div class="quick-actions">
        <button class="qa-btn" data-action="center">Center</button>
        <button class="qa-btn" data-action="fullwidth">Full width</button>
        <button class="qa-btn" data-action="equal-spacing" data-multi="true">Equal spacing</button>
        <button class="qa-btn" data-action="same-size" data-multi="true">Same size</button>
        <button class="qa-btn" data-action="revert">Revert</button>
      </div>
      <div class="processing" style="display:none">⏳ Processing...<button class="cancel" style="display:none">Cancel</button></div>
      <div class="hint">Alt+Click to select · Alt+R recall · Esc to clear</div>
      <div class="history-panel" style="display:none"><div class="history-panel-title">Recent</div></div>
    `;
    shadow.appendChild(style);
    shadow.appendChild(widget);

    dot = shadow.querySelector(".dot")!;
    closeBtn = shadow.querySelector(".close-btn")!;
    selectionsContainer = shadow.querySelector(".selections")!;
    input = shadow.querySelector("textarea")!;
    submitBtn = shadow.querySelector(".submit-btn")!;
    processingEl = shadow.querySelector(".processing")!;
    errorBanner = shadow.querySelector(".error-banner")!;
    errorMsg = shadow.querySelector(".error-msg")!;
    historyDropdown = shadow.querySelector(".history-panel")!;
    cancelBtn = shadow.querySelector(".cancel")!;
    quickActions = shadow.querySelector(".quick-actions")!;
    qaMultiBtns = shadow.querySelectorAll(".qa-btn[data-multi]");
    hint = shadow.querySelector(".hint")!;

    // Re-initialize history with actual DOM elements
    historyMod = createHistory({ localStorage, input, historyDropdown });

    // Wire up events
    closeBtn.addEventListener("click", () => disconnect(sendMessage));

    errorBanner.addEventListener("click", () => {
      errorBanner.style.display = "none";
      if (errorBannerTimer) clearTimeout(errorBannerTimer);
    });

    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 120) + "px";
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitBtn.click(); }
    });

    input.addEventListener("focus", () => { widget.classList.add("expanded"); historyMod.showHistory(); });
    input.addEventListener("blur", () => { widget.classList.remove("expanded"); setTimeout(() => { historyDropdown.style.display = "none"; }, 200); });

    historyDropdown.addEventListener("mousedown", (e) => {
      const item = (e.target as Element).closest(".history-item");
      const clearEl = (e.target as Element).closest(".history-clear");
      if (item) { input.value = item.textContent || ""; historyDropdown.style.display = "none"; input.focus(); }
      if (clearEl) { historyMod.clearHistory(); historyDropdown.style.display = "none"; }
    });

    cancelBtn.addEventListener("click", () => {
      sendMessage.send({ type: "design:deselect", dataOid: "__all__" });
      isProcessing = false;
      processingEl.style.display = "none";
      cancelBtn.style.display = "none";
      if (processingTimer) { clearTimeout(processingTimer); processingTimer = null; }
      reapplyAllHighlights();
      render();
    });

    const qaInstructions: Record<string, string> = {
      center: "Center these elements",
      fullwidth: "Make these elements full width",
      "equal-spacing": "Add equal spacing between these elements",
      "same-size": "Make these elements the same size",
      revert: "Revert the design changes you just made",
    };
    quickActions.addEventListener("click", (e) => {
      const btn = (e.target as Element).closest(".qa-btn");
      if (!btn || isProcessing) return;
      const action = btn.getAttribute("data-action");
      if (action && qaInstructions[action]) { input.value = qaInstructions[action]; submitBtn.click(); }
    });

    submitBtn.addEventListener("click", () => {
      if (selectionMod.getSelections().length === 0 || isProcessing) return;
      const instruction = input.value.trim();
      if (!instruction) return;
  historyMod.saveHistory(instruction);
      const structuralContext = computeStructuralContext();
      submittedOids = selectionMod.getSelections().map((s) => s.dataOid);
      sendMessage.send({
        type: "design:submit",
        selections: selectionMod.getSelections().map((s) => s.dataOid),
        instruction,
        structuralContext,
      });
      input.value = "";
      input.style.height = "auto";
      isProcessing = true;
      lastSelections = selectionMod.getSelections().slice();
      processingEl.style.display = "block";
      render();
    });

    render();

    // Expose widget API — must be set HERE so ws.onopen can detect creation
    (window as any).__piDesignWidget = {
      addSelection(data: any) {
        return addSelection(data, sendMessage);
      },
      removeSelection(dataOid: string) {
        removeSelection(dataOid, sendMessage);
      },
      clearAllSelections() {
        clearAllSelections(sendMessage);
      },
      setProcessing(value: boolean) {
        isProcessing = value;
        processingEl.style.display = value ? "block" : "none";
        cancelBtn.style.display = "none";
        if (processingTimer) { clearTimeout(processingTimer); processingTimer = null; }
        if (value) {
          submittedOids = selectionMod.getSelections().map((s) => s.dataOid);
          for (const sel of selectionMod.getSelections()) clearHighlight(sel.dataOid);
          processingTimer = setTimeout(() => {
            if (isProcessing) cancelBtn.style.display = "inline";
          }, 60000);
        }
        if (!value) reapplyAllHighlights();
        render();
      },
      isConnected() { return sendMessage.isConnected(); },
      flashEditedElements,
      showSuccess,
      showError,
      updateConnection(connected: boolean) {
        isConnected = connected;
        if (dot) {
          dot.className = "dot" + (connected ? " connected" : "");
          dot.title = connected ? "Connected to Pi" : "Disconnected — changes won't be sent";
        }
        if (submitBtn) submitBtn.disabled = !connected || selectionMod.getSelections().length === 0 || isProcessing;
        if (input) input.disabled = !connected || isProcessing;
        if (connected && errorBanner) errorBanner.style.display = "none";
        render();
      },
      destroy: destroyWidget,
    };

    restoreSelections();
  }

  function render() {
    if (!shadow) return;
    dot.className = "dot" + (isConnected ? " connected" : "");
    dot.title = isConnected ? "Connected to Pi" : "Disconnected — changes won't be sent";
    submitBtn.disabled = selectionMod.getSelections().length === 0 || isProcessing;
    input.disabled = isProcessing;
    quickActions.style.display = selectionMod.getSelections().length > 0 && !isProcessing ? "flex" : "none";
    qaMultiBtns.forEach((btn) => { (btn as HTMLElement).style.display = selectionMod.getSelections().length >= 2 ? "" : "none"; });
    processingEl.style.display = isProcessing ? "block" : "none";

    selectionsContainer.innerHTML = "";
    for (let i = 0; i < selectionMod.getSelections().length; i++) {
      const sel = selectionMod.getSelections()[i];
      const color = SELECTION_COLORS[i % SELECTION_COLORS.length];
      const parsed = parseDataOid(sel.dataOid);
      const location = parsed ? `${parsed.filePath}:${parsed.line}` : sel.dataOid;
      const item = document.createElement("div");
      item.className = "selection-item";
      item.innerHTML = `<span class="color-dot" style="background:${color}"></span><span class="tag">&lt;${escapeHtml(sel.tagName)}&gt;</span><span class="file">${escapeHtml(location)}</span><button class="remove" data-oid="${escapeHtml(sel.dataOid)}">×</button>`;
      item.querySelector(".remove")!.addEventListener("click", (e) => { e.stopPropagation(); removeSelection(sel.dataOid, { send(msg: any) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); }, isConnected() { return ws !== null && ws.readyState === WebSocket.OPEN; } }); });
      item.addEventListener("click", () => flashElement(sel.dataOid));
      selectionsContainer.appendChild(item);
    }
    if (selectionMod.getSelections().length === 0) {
      selectionsContainer.innerHTML = '<div style="color:#6c7086;font-size:12px;padding:4px 0;">No element selected</div>';
    }
  }

  selectionMod.setRender(render);

  function flashEditedElements() {
    if (submittedOids.length === 0) return;
    let flashed = 0;
    for (const oid of submittedOids) {
      const el = findByOid(oid);
      if (el) {
        flashed++;
        (el as HTMLElement).style.outline = "2px solid #a6e3a1";
        (el as HTMLElement).style.outlineOffset = "2px";
        ((element: Element, dataOid: string) => {
          setTimeout(() => {
            const selIdx = selectionMod.getSelections().findIndex((s) => s.dataOid === dataOid);
            if (selIdx >= 0) {
              applyHighlight(dataOid, SELECTION_COLORS[selIdx % SELECTION_COLORS.length]);
            } else {
              (element as HTMLElement).style.outline = "";
              (element as HTMLElement).style.outlineOffset = "";
            }
          }, 2000);
        })(el, oid);
      }
    }
    console.log(`[pi-design] Flashed ${flashed}/${submittedOids.length} elements`);
    submittedOids = [];
  }

  function showSuccess() {
    if (hint) {
      hint.textContent = "✓ Changes applied";
      hint.style.color = "#a6e3a1";
      setTimeout(() => { hint.textContent = "Alt+Click to select · Alt+R recall · Esc to clear"; hint.style.color = ""; }, 3000);
    }
  }

  function showError(message: string, persistent: boolean = false) {
    if (!errorBanner || !errorMsg) return;
    errorMsg.textContent = message;
    errorBanner.style.display = "flex";
    if (errorBannerTimer) clearTimeout(errorBannerTimer);
    if (!persistent) {
      errorBannerTimer = setTimeout(() => { errorBanner.style.display = "none"; }, 10000);
    }
  }


  function destroyWidget() {
    if (processingTimer) { clearTimeout(processingTimer); processingTimer = null; }
    if (errorBannerTimer) { clearTimeout(errorBannerTimer); errorBannerTimer = null; }
    if (restoreObserver) { restoreObserver.disconnect(); restoreObserver = null; }
    const host = document.getElementById(WIDGET_ID);
    if (host) host.remove();
    delete (window as any).__piDesignWidget;
    hideHoverTooltip();
  }

  // --- Server-triggered highlight ---
  function highlightElement(dataOid: string) {
    const el = findByOid(dataOid);
    if (el) {
      (el as HTMLElement).style.outline = "2px solid #3b82f6";
      (el as HTMLElement).style.outlineOffset = "2px";
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // --- Hover Tooltip ---
  const hoverTooltipMod = createHoverTooltip({ document, escapeHtml });

  function showHoverTooltip(dataOid: string, x: number, y: number) {
    const parsed = parseDataOid(dataOid);
    const location = parsed ? `${parsed.filePath}:${parsed.line}` : dataOid;
    const el = findByOid(dataOid);
    const tag = el ? el.tagName.toLowerCase() : "";
    const label = tag ? `<${tag}>` : "";
    hoverTooltipMod.show(label, location, x, y);
  }

  function hideHoverTooltip() {
    hoverTooltipMod.hide();
  }

  // --- Alt+Click ---
  function handleAltClick(e: MouseEvent) {
    if (!isAltDown) return;
    const target = (e.target as Element).closest("[data-oid],[data-source]");
    if (!target || (e.target as Element).closest(`#${WIDGET_ID}`)) return;
    e.preventDefault();
    e.stopPropagation();
    const dataOid = target.getAttribute("data-oid") || target.getAttribute("data-source");
    if (!dataOid) return;
    const sendMessage = {
      send(msg: any) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); },
      isConnected() { return ws !== null && ws.readyState === WebSocket.OPEN; },
    };
    const selectionData = buildSelectionData(target, {
      getSelector,
      getComputedStyles,
      getBoundingBox,
    });
    const wasAdded = addSelection(selectionData, sendMessage);
    if (wasAdded && ws && isConnected) {
      sendMessage.send({
        type: "design:select",
        dataOid: selectionData.dataOid,
        selector: selectionData.selector,
        computedStyles: selectionData.computedStyles,
        boundingBox: selectionData.boundingBox,
        tagName: selectionData.tagName,
        textContent: selectionData.textContent,
      });
    }
  }

  document.addEventListener("click", handleAltClick as EventListener, true);

  // --- Alt+Hover ---
  document.addEventListener("mouseover", (e) => {
    if (!isAltDown || !(window as any).__piDesignWidget) return;
    const target = (e.target as Element).closest("[data-oid],[data-source]");
    if (!target) { hideHoverTooltip(); return; }
    const dataOid = target.getAttribute("data-oid") || target.getAttribute("data-source");
    if (dataOid) showHoverTooltip(dataOid, (e as MouseEvent).clientX, (e as MouseEvent).clientY);
  });

  document.addEventListener("mousemove", (e) => {
    const tooltipEl = hoverTooltipMod.getEl();
    if (!isAltDown || !tooltipEl || tooltipEl.style.display === "none") return;
    if (!(e.target as Element).closest("[data-oid],[data-source]")) { hideHoverTooltip(); return; }
    tooltipEl.style.left = ((e as MouseEvent).clientX + 12) + "px";
    tooltipEl.style.top = ((e as MouseEvent).clientY + 12) + "px";
  });

  document.addEventListener("mouseout", (e) => {
    if (!(e.target as Element).closest("[data-oid],[data-source]")) return;
    if (!(e as any).relatedTarget || !((e as any).relatedTarget as Element).closest("[data-oid],[data-source]")) hideHoverTooltip();
  });

  // --- Escape + Alt+R ---
  document.addEventListener("keydown", (e) => {
    const sendMessage = {
      send(msg: any) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); },
      isConnected() { return ws !== null && ws.readyState === WebSocket.OPEN; },
    };
    if (e.key === "Escape" && !e.altKey && document.activeElement !== input) {
      clearAllSelections(sendMessage);
    }
    if (e.key === "r" && e.altKey && !e.ctrlKey && !e.metaKey && (window as any).__piDesignWidget && selectionMod.getSelections().length === 0 && lastSelections.length > 0 && !isProcessing) {
      e.preventDefault();
      for (const sel of lastSelections) {
        const el = findByOid(sel.dataOid);
        if (!el) continue;
        addSelection(sel, sendMessage);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        ((element: Element) => {
          (element as HTMLElement).style.outlineOffset = "6px";
          setTimeout(() => { (element as HTMLElement).style.outlineOffset = "2px"; }, 400);
        })(el);
      }
    }
  });

  // --- Disconnect ---
  function disconnect(sendMessage: { send(msg: any): void; isConnected(): boolean }) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendMessage.send({ type: "design:disconnect" });
    }
    if (ws) { ws.onclose = null; ws.close(); ws = null; isConnected = false; }
    sessionStorage.removeItem("pi-design-selections");
    destroyWidget();
  }

  // --- Init ---
  const sendMessage = {
    send(msg: any) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); },
    isConnected() { return ws !== null && ws.readyState === WebSocket.OPEN; },
  };

  window.addEventListener("beforeunload", () => {
    if (ws && isConnected) sendMessage.send({ type: "design:disconnect" });
    // Don't call disconnect() — it wipes sessionStorage, which is needed for reload recovery
    if (ws) { ws.onclose = null; ws.close(); ws = null; isConnected = false; }
    destroyWidget();
  });
  connectWS(sendMessage);
}
