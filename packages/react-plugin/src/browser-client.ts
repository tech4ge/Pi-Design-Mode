import { parseDataOid } from "./data-oid/shared.js";
import { reconnectPolicy } from "./reconnect-policy.js";
import type { ClientMessage, ServerMessage } from "./protocol.js";
import { createHistory } from "./browser-client/history.js";
import { createHoverTooltip } from "./browser-client/hover-tooltip.js";
import { createSelectionManager } from "./browser-client/selection.js";
import { buildSelectionData } from "./browser-client/click-handler.js";
import { resolveElement as resolveElementImpl, type ResolvedSelection } from "./browser-client/element-resolver.js";
import { routeServerMessage } from "./browser-client/connection.js";
import { createWidgetState } from "./browser-client/widget.js";
import { escapeHtml, getSelector, computeStructuralContext as computeStructuralContextImpl, getComputedStyles, getBoundingBox } from "./browser-client/utils.js";
import { applyHighlight as applyHighlightImpl, clearHighlight as clearHighlightImpl, reapplyAllHighlights as reapplyAllHighlightsImpl, type ElementResolver } from "./browser-client/highlight.js";
import { WIDGET_CSS, WIDGET_HTML } from "./browser-client/widget-template.js";

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

  const widgetState = createWidgetState();
  let isAltDown = false;
  let lastSelections: any[] = [];
  let submittedSelections: any[] = [];
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

  function resolveSelectionElement(sel: any): Element | null {
    if (sel.elementRef || sel.instanceIndex !== undefined || sel.structuralSelector) {
      return resolveElementImpl(
        sel as ResolvedSelection,
        (s) => Array.from(document.querySelectorAll(s)),
        (s) => document.querySelector(s),
      );
    }
    return findByOid(sel.dataOid);
  }

  // parseDataOid is imported from data-oid/shared at the top of this module.
  // tsup inlines it into the IIFE — no runtime import.

  function computeStructuralContext() {
    return computeStructuralContextImpl(
      selectionMod.getSelections().map((s) => s.dataOid),
      findByOid,
    );
  }

  function persistSelections() {
    try {
      if (selectionMod.getSelections().length > 0) {
        // Strip non-serializable WeakRef before persisting
        const serializable = selectionMod.getSelections().map((s: any) => {
          const { elementRef, ...rest } = s;
          return rest;
        });
        sessionStorage.setItem("pi-design-selections", JSON.stringify(serializable));
      }
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
      if (selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid && x.instanceIndex === s.instanceIndex) >= 0) continue;
      // Restore WeakRef from DOM
      const el = resolveSelectionElement(s);
      if (!el) continue;
      s.elementRef = new WeakRef(el);
      if (s.colorIndex === undefined) s.colorIndex = selectionMod.getSelections().length - 1;
      selectionMod.getSelections().push(s);
      applyHighlight(s, SELECTION_COLORS[s.colorIndex % SELECTION_COLORS.length]);
      found++;
    }
    if (found > 0) {
      render();
      if (found >= saved.length) return;
    }

    // Some elements not in DOM yet — watch for them via MutationObserver
    const missingOids = saved.filter(
      (s) => selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid && x.instanceIndex === s.instanceIndex) < 0,
    );
    if (missingOids.length === 0) return;

    restoreObserver = new MutationObserver(() => {
      const stillMissing = missingOids.filter(
        (s) => selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid && x.instanceIndex === s.instanceIndex) < 0 && !resolveSelectionElement(s),
      );
      if (stillMissing.length === missingOids.length) return; // no change yet

      // At least one element appeared — try restoring again
      const nowFound = missingOids.filter(
        (s) => selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid && x.instanceIndex === s.instanceIndex) < 0 && resolveSelectionElement(s) !== null,
      );
      for (const s of nowFound) {
        s.elementRef = new WeakRef(resolveSelectionElement(s));
        if (s.colorIndex === undefined) s.colorIndex = selectionMod.getSelections().length - 1;
        selectionMod.getSelections().push(s);
        applyHighlight(s, SELECTION_COLORS[s.colorIndex % SELECTION_COLORS.length]);
      }
      render();

      // All restored?
      const remaining = missingOids.filter(
        (s) => selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid && x.instanceIndex === s.instanceIndex) < 0,
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
      widgetState.updateConnection(true);
      reconnectAttempt = 0; // Reset on successful connection
      sendMessage.send({ type: "design:connect", url: window.location.href, title: document.title });
      if ((window as any).__piDesignWidget) {
        (window as any).__piDesignWidget.updateConnection(true);
      } else {
        createWidget(sendMessage);
      }
    };
    ws.onclose = () => {
      widgetState.updateConnection(false);
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

  function applyHighlight(sel: any, color: string) {
    applyHighlightImpl(sel.dataOid, color, findByOid, resolveSelectionElement, sel);
  }

  function clearHighlight(sel: any) {
    clearHighlightImpl(sel.dataOid, findByOid, resolveSelectionElement, sel);
  }

  function reapplyAllHighlights() {
    reapplyAllHighlightsImpl(selectionMod.getSelections(), SELECTION_COLORS, findByOid, applyHighlightImpl, resolveSelectionElement);
  }

  // --- Selection module (instantiated after highlight functions) ---
  selectionMod = createSelectionManager({
    applyHighlight: (sel: any) => {
      if (sel.colorIndex === undefined) sel.colorIndex = selectionMod.getSelections().length - 1;
      applyHighlight(sel, SELECTION_COLORS[sel.colorIndex % SELECTION_COLORS.length]);
    },
    clearHighlight,
    reapplyAllHighlights,
    persistSelections,
  });

  function addSelection(sel: any, sendMessage: { send(msg: ClientMessage): void; isConnected(): boolean }) {
    selectionMod.setSendMessage(sendMessage);
    return selectionMod.addSelection(sel);
  }

  function removeSelection(dataOid: string, instanceIndex: number | undefined, sendMessage: { send(msg: ClientMessage): void; isConnected(): boolean }) {
    selectionMod.setSendMessage(sendMessage);
    selectionMod.removeSelection(dataOid, instanceIndex);
  }

  function clearAllSelections(sendMessage: { send(msg: ClientMessage): void; isConnected(): boolean }) {
    selectionMod.setSendMessage(sendMessage);
    selectionMod.clearAllSelections();
  }

  function flashElement(sel: any) {
    const el = sel ? resolveSelectionElement(sel) : (sel?.dataOid ? findByOid(sel.dataOid) : null);
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
    style.textContent = WIDGET_CSS;

    const widget = document.createElement("div");
    widget.className = "widget";
    widget.innerHTML = WIDGET_HTML;
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
      widgetState.setProcessing(false);
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
      if (!btn || widgetState.isProcessing()) return;
      const action = btn.getAttribute("data-action");
      if (action && qaInstructions[action]) { input.value = qaInstructions[action]; submitBtn.click(); }
    });

    submitBtn.addEventListener("click", () => {
      if (selectionMod.getSelections().length === 0 || widgetState.isProcessing()) return;
      const instruction = input.value.trim();
      if (!instruction) return;
  historyMod.saveHistory(instruction);
      const structuralContext = computeStructuralContext();
      submittedSelections = selectionMod.getSelections().slice();
      sendMessage.send({
        type: "design:submit",
        selections: selectionMod.getSelections().map((s) => ({
          dataOid: s.dataOid,
          instanceIndex: s.instanceIndex,
          structuralSelector: s.structuralSelector,
        })),
        instruction,
        structuralContext,
      });
      input.value = "";
      input.style.height = "auto";
      widgetState.setProcessing(true);
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
        widgetState.setProcessing(value);
        processingEl.style.display = value ? "block" : "none";
        cancelBtn.style.display = "none";
        if (processingTimer) { clearTimeout(processingTimer); processingTimer = null; }
        if (value) {
          submittedSelections = selectionMod.getSelections().slice();
          for (const sel of selectionMod.getSelections()) clearHighlight(sel);
          processingTimer = setTimeout(() => {
            if (widgetState.isProcessing()) cancelBtn.style.display = "inline";
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
        widgetState.updateConnection(connected);
        if (dot) {
          dot.className = "dot" + (connected ? " connected" : "");
          dot.title = connected ? "Connected to Pi" : "Disconnected — changes won't be sent";
        }
        if (submitBtn) submitBtn.disabled = !connected || selectionMod.getSelections().length === 0 || widgetState.isProcessing();
        if (input) input.disabled = !connected || widgetState.isProcessing();
        if (connected && errorBanner) errorBanner.style.display = "none";
        render();
      },
      destroy: destroyWidget,
    };

    restoreSelections();
  }

  function render() {
    if (!shadow) return;
    dot.className = "dot" + (widgetState.isConnected() ? " connected" : "");
    dot.title = widgetState.isConnected() ? "Connected to Pi" : "Disconnected — changes won't be sent";
    submitBtn.disabled = selectionMod.getSelections().length === 0 || widgetState.isProcessing();
    input.disabled = widgetState.isProcessing();
    quickActions.style.display = selectionMod.getSelections().length > 0 && !widgetState.isProcessing() ? "flex" : "none";
    qaMultiBtns.forEach((btn) => { (btn as HTMLElement).style.display = selectionMod.getSelections().length >= 2 ? "" : "none"; });
    processingEl.style.display = widgetState.isProcessing() ? "block" : "none";

    selectionsContainer.innerHTML = "";
    for (let i = 0; i < selectionMod.getSelections().length; i++) {
      const sel = selectionMod.getSelections()[i];
      const color = SELECTION_COLORS[(sel.colorIndex ?? i) % SELECTION_COLORS.length];
      const parsed = parseDataOid(sel.dataOid);
      const location = parsed ? `${parsed.filePath}:${parsed.line}` : sel.dataOid;
      const instanceLabel = sel.instanceIndex > 0 ? ` #${sel.instanceIndex + 1}` : "";
      const item = document.createElement("div");
      item.className = "selection-item";
      item.innerHTML = `<span class="color-dot" style="background:${color}"></span><span class="tag">&lt;${escapeHtml(sel.tagName)}&gt;${instanceLabel}</span><span class="file">${escapeHtml(location)}</span><button class="remove" data-oid="${escapeHtml(sel.dataOid)}" data-instance="${sel.instanceIndex ?? 0}">×</button>`;
      item.querySelector(".remove")!.addEventListener("click", (e) => { e.stopPropagation(); removeSelection(sel.dataOid, sel.instanceIndex, { send(msg: any) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); }, isConnected() { return ws !== null && ws.readyState === WebSocket.OPEN; } }); });
      item.addEventListener("click", () => flashElement(sel));
      selectionsContainer.appendChild(item);
    }
    if (selectionMod.getSelections().length === 0) {
      selectionsContainer.innerHTML = '<div style="color:#6c7086;font-size:12px;padding:4px 0;">No element selected</div>';
    }
  }

  selectionMod.setRender(render);

  function flashEditedElements() {
    if (submittedSelections.length === 0) return;
    let flashed = 0;
    for (const sel of submittedSelections) {
      const el = resolveSelectionElement(sel);
      if (el) {
        flashed++;
        (el as HTMLElement).style.outline = "2px solid #a6e3a1";
        (el as HTMLElement).style.outlineOffset = "2px";
        ((element: Element, selRef: any) => {
          setTimeout(() => {
            const selIdx = selectionMod.getSelections().findIndex((s) => s.dataOid === selRef.dataOid && s.instanceIndex === selRef.instanceIndex);
            if (selIdx >= 0) {
              applyHighlight(selectionMod.getSelections()[selIdx], SELECTION_COLORS[(selectionMod.getSelections()[selIdx].colorIndex ?? selIdx) % SELECTION_COLORS.length]);
            } else {
              (element as HTMLElement).style.outline = "";
              (element as HTMLElement).style.outlineOffset = "";
            }
          }, 2000);
        })(el, sel);
      }
    }
    console.log(`[pi-design] Flashed ${flashed}/${submittedSelections.length} elements`);
    submittedSelections = [];
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
      querySelectorAll: (s: string) => Array.from(document.querySelectorAll(s)),
      cssEscape: CSS.escape,
      bodyElement: document.body,
    });
    const wasAdded = addSelection(selectionData, sendMessage);
    if (wasAdded && ws && widgetState.isConnected()) {
      sendMessage.send({
        type: "design:select",
        dataOid: selectionData.dataOid,
        instanceIndex: selectionData.instanceIndex,
        structuralSelector: selectionData.structuralSelector,
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
    if (e.key === "r" && e.altKey && !e.ctrlKey && !e.metaKey && (window as any).__piDesignWidget && selectionMod.getSelections().length === 0 && lastSelections.length > 0 && !widgetState.isProcessing()) {
      e.preventDefault();
      for (const sel of lastSelections) {
        const el = resolveSelectionElement(sel);
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
    if (ws) { ws.onclose = null; ws.close(); ws = null; widgetState.updateConnection(false); }
    sessionStorage.removeItem("pi-design-selections");
    destroyWidget();
  }

  // --- Init ---
  const sendMessage = {
    send(msg: any) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); },
    isConnected() { return ws !== null && ws.readyState === WebSocket.OPEN; },
  };

  window.addEventListener("beforeunload", () => {
    if (ws && widgetState.isConnected()) sendMessage.send({ type: "design:disconnect" });
    // Don't call disconnect() — it wipes sessionStorage, which is needed for reload recovery
    if (ws) { ws.onclose = null; ws.close(); ws = null; widgetState.updateConnection(false); }
    destroyWidget();
  });
  connectWS(sendMessage);
}
