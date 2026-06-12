(() => {
  // src/data-oid/shared.ts
  function parseDataOid(dataOid) {
    const babelMatch = dataOid.match(/^([cef]):([0-9a-f]+):r:(.+):(\d+):(\d+)$/);
    if (babelMatch) {
      return {
        type: babelMatch[1],
        projectHash: babelMatch[2],
        filePath: babelMatch[3],
        line: parseInt(babelMatch[4], 10),
        column: parseInt(babelMatch[5], 10)
      };
    }
    const swcFull = dataOid.match(/^(.+):(\d+):(\d+)$/);
    if (swcFull) {
      return {
        type: "c",
        projectHash: "",
        filePath: swcFull[1],
        line: parseInt(swcFull[2], 10),
        column: parseInt(swcFull[3], 10)
      };
    }
    const swcLine = dataOid.match(/^(.+):(\d+)$/);
    if (swcLine) {
      return {
        type: "c",
        projectHash: "",
        filePath: swcLine[1],
        line: parseInt(swcLine[2], 10),
        column: 0
      };
    }
    return null;
  }

  // src/reconnect-policy.ts
  var MAX_ATTEMPTS = 10;
  var MAX_DELAY_MS = 3e4;
  var INITIAL_DELAY_MS = 2e3;
  function reconnectPolicy(attempt) {
    if (attempt >= MAX_ATTEMPTS) {
      return { giveUp: true };
    }
    const rawDelay = INITIAL_DELAY_MS * Math.pow(2, attempt);
    const delay = Math.min(rawDelay, MAX_DELAY_MS);
    return { delay };
  }

  // src/browser-client/history.ts
  var STORAGE_KEY = "pi-design-history";
  var MAX_ENTRIES = 20;
  function createHistory(deps) {
    const { localStorage: storage, input, historyDropdown } = deps;
    function getHistory() {
      try {
        const h = storage.getItem(STORAGE_KEY);
        return h ? JSON.parse(h) : [];
      } catch {
        return [];
      }
    }
    function saveHistory(instruction) {
      if (!instruction.trim()) return;
      let h = getHistory();
      h = h.filter((x) => x !== instruction);
      h.unshift(instruction);
      if (h.length > MAX_ENTRIES) h = h.slice(0, MAX_ENTRIES);
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(h));
      } catch {
      }
    }
    function showHistory() {
      const h = getHistory();
      if (h.length === 0 || input.value.length > 0) {
        if ("style" in historyDropdown) {
          historyDropdown.style.display = "none";
        }
        return;
      }
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
        historyDropdown.style.display = "flex";
      }
    }
    function clearHistory() {
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {
      }
    }
    return { getHistory, saveHistory, showHistory, clearHistory };
  }

  // src/browser-client/hover-tooltip.ts
  function createHoverTooltip(deps) {
    const { document: doc, escapeHtml: escapeHtml2 } = deps;
    let hoverTooltipEl = null;
    function show(label, location, x, y) {
      if (!hoverTooltipEl) {
        hoverTooltipEl = doc.createElement("div");
        hoverTooltipEl.id = "pi-design-hover-tooltip";
        hoverTooltipEl.style.cssText = "position:fixed;z-index:999998;pointer-events:none;font-family:system-ui,-apple-system,sans-serif;font-size:12px;background:#1e1e2e;color:#cdd6f4;border:1px solid #45475a;border-radius:6px;padding:4px 8px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);";
        doc.body.appendChild(hoverTooltipEl);
      }
      hoverTooltipEl.innerHTML = `<span style="color:#89b4fa;font-family:monospace">${escapeHtml2(label)}</span> <span style="color:#a6adc8">${escapeHtml2(location)}</span>`;
      hoverTooltipEl.style.left = x + 12 + "px";
      hoverTooltipEl.style.top = y + 12 + "px";
      hoverTooltipEl.style.display = "block";
    }
    function hide() {
      if (hoverTooltipEl) hoverTooltipEl.style.display = "none";
    }
    function getEl() {
      return hoverTooltipEl;
    }
    return { show, hide, getEl };
  }

  // src/browser-client/selection.ts
  function createSelectionManager(deps) {
    const { applyHighlight: applyHighlight2, clearHighlight: clearHighlight2, reapplyAllHighlights: reapplyAllHighlights2, persistSelections } = deps;
    let selections = [];
    let sendMessage = null;
    function setSendMessage(sm) {
      sendMessage = sm;
    }
    function getSelections() {
      return selections;
    }
    function setSelections(s) {
      selections = s;
    }
    let _render = null;
    function setRender(r) {
      _render = r;
    }
    function addSelection(sel) {
      const existing = selections.findIndex((s) => s.dataOid === sel.dataOid && s.instanceIndex === sel.instanceIndex);
      if (existing !== -1) {
        removeSelection(sel.dataOid, sel.instanceIndex);
        return false;
      }
      selections.push(sel);
      applyHighlight2(sel);
      persistSelections();
      _render == null ? void 0 : _render();
      return true;
    }
    function removeSelection(dataOid, instanceIndex) {
      const removed = selections.filter((s) => {
        if (instanceIndex !== void 0) {
          return s.dataOid === dataOid && s.instanceIndex === instanceIndex;
        }
        return s.dataOid === dataOid;
      });
      selections = selections.filter((s) => {
        if (instanceIndex !== void 0) {
          return !(s.dataOid === dataOid && s.instanceIndex === instanceIndex);
        }
        return s.dataOid !== dataOid;
      });
      for (const sel of removed) clearHighlight2(sel);
      sendMessage == null ? void 0 : sendMessage.send({ type: "design:deselect", dataOid, instanceIndex });
      persistSelections();
      reapplyAllHighlights2();
      _render == null ? void 0 : _render();
    }
    function clearAllSelections() {
      for (const sel of selections) clearHighlight2(sel);
      selections = [];
      sendMessage == null ? void 0 : sendMessage.send({ type: "design:deselect", dataOid: "__all__" });
      persistSelections();
      _render == null ? void 0 : _render();
    }
    return { getSelections, setSelections, addSelection, removeSelection, clearAllSelections, setSendMessage, setRender };
  }

  // src/browser-client/element-resolver.ts
  function defaultCssEscape(value) {
    if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
  function getInstanceIndex(element, dataOid, querySelectorAll, cssEscape = defaultCssEscape) {
    const escaped = cssEscape(dataOid);
    const all = querySelectorAll(`[data-oid="${escaped}"],[data-source="${escaped}"]`);
    for (let i = 0; i < all.length; i++) {
      if (all[i] === element) return i;
    }
    return -1;
  }
  function resolveElement(selection, querySelectorAll, querySelector, cssEscape = defaultCssEscape) {
    const el = selection.elementRef.deref();
    if ((el == null ? void 0 : el.isConnected) === true) {
      return el;
    }
    if (selection.instanceIndex >= 0) {
      const escaped = cssEscape(selection.dataOid);
      const all = querySelectorAll(`[data-oid="${escaped}"],[data-source="${escaped}"]`);
      if (selection.instanceIndex < all.length) {
        return all[selection.instanceIndex];
      }
    }
    if (selection.structuralSelector) {
      const found = querySelector(selection.structuralSelector);
      if (found) return found;
    }
    return null;
  }
  function computeStructuralSelector(element, parentLimit) {
    const parts = [];
    let current = element;
    while (current && current !== parentLimit) {
      const parent = current.parentElement;
      if (!parent) break;
      const tag = current.tagName.toLowerCase();
      const siblings = Array.from(parent.children);
      const sameTagSiblings = siblings.filter(
        (s) => s.tagName === current.tagName
      );
      if (sameTagSiblings.length === 1) {
        parts.unshift(tag);
      } else {
        const index = siblings.indexOf(current) + 1;
        parts.unshift(`${tag}:nth-child(${index})`);
      }
      current = parent;
      if (current === parentLimit) break;
    }
    return parts.join(" > ");
  }

  // src/browser-client/click-handler.ts
  function buildSelectionData(target, deps) {
    const dataOid = target.getAttribute("data-oid") || target.getAttribute("data-source") || "";
    const instanceIndex = getInstanceIndex(target, dataOid, deps.querySelectorAll, deps.cssEscape);
    const structuralSelector = deps.bodyElement ? computeStructuralSelector(target, deps.bodyElement) : "";
    return {
      dataOid,
      instanceIndex,
      elementRef: new WeakRef(target),
      structuralSelector,
      selector: deps.getSelector(target),
      computedStyles: deps.getComputedStyles(target),
      boundingBox: deps.getBoundingBox(target),
      tagName: target.tagName.toLowerCase(),
      textContent: (target.textContent || "").slice(0, 200)
    };
  }

  // src/browser-client/connection.ts
  function routeServerMessage(message, handlers) {
    var _a, _b, _c, _d, _e;
    switch (message.type) {
      case "design:mode:off":
        (_a = handlers.onDisconnect) == null ? void 0 : _a.call(handlers);
        break;
      case "design:highlight":
        (_b = handlers.onHighlight) == null ? void 0 : _b.call(handlers, message.dataOid);
        break;
      case "design:processing":
        (_c = handlers.onProcessing) == null ? void 0 : _c.call(handlers, true);
        break;
      case "design:done":
        (_d = handlers.onDone) == null ? void 0 : _d.call(handlers);
        break;
      case "design:error":
        (_e = handlers.onError) == null ? void 0 : _e.call(handlers, message.message || "Unknown error");
        break;
    }
  }

  // src/browser-client/widget.ts
  function createWidgetState() {
    let connected = false;
    let processing = false;
    let lastError = null;
    let lastErrorPersistent = false;
    function isConnected() {
      return connected;
    }
    function isProcessing() {
      return processing;
    }
    function getLastError() {
      return lastError;
    }
    function isLastErrorPersistent() {
      return lastErrorPersistent;
    }
    function updateConnection(v) {
      connected = v;
    }
    function setProcessing(v) {
      processing = v;
    }
    function showError(msg, persistent = false) {
      lastError = msg;
      lastErrorPersistent = persistent;
    }
    return { isConnected, isProcessing, getLastError, isLastErrorPersistent, updateConnection, setProcessing, showError };
  }

  // src/browser-client/utils.ts
  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function getSelector(element) {
    if (element.id) return "#" + element.id;
    return element.tagName.toLowerCase();
  }
  function computeStructuralContext(oids, findByOid) {
    if (oids.length <= 1) return { siblings: [], sameComponent: [] };
    const parentMap = /* @__PURE__ */ new Map();
    for (const oid of oids) {
      const el = findByOid(oid);
      if (el && el.parentElement) {
        if (!parentMap.has(el.parentElement)) parentMap.set(el.parentElement, []);
        parentMap.get(el.parentElement).push(oid);
      }
    }
    const siblings = [];
    for (const [, childOids] of parentMap) {
      if (childOids.length > 1) siblings.push(childOids);
    }
    const sameComponent = [];
    const componentMap = /* @__PURE__ */ new Map();
    for (const oid of oids) {
      const parsed = oid.match(/^c:([^:]+):/);
      if (parsed) {
        const comp = parsed[1];
        if (!componentMap.has(comp)) componentMap.set(comp, []);
        componentMap.get(comp).push(oid);
      }
    }
    for (const [, compOids] of componentMap) {
      if (compOids.length > 1) sameComponent.push(compOids);
    }
    return { siblings, sameComponent };
  }
  function getComputedStyles(element) {
    const cs = window.getComputedStyle(element);
    return {
      display: cs.display,
      position: cs.position,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      margin: cs.margin,
      padding: cs.padding,
      width: cs.width,
      height: cs.height,
      borderRadius: cs.borderRadius,
      gap: cs.gap,
      justifyContent: cs.justifyContent,
      alignItems: cs.alignItems,
      flexDirection: cs.flexDirection
    };
  }
  function getBoundingBox(element) {
    const rect = element.getBoundingClientRect();
    return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
  }

  // src/browser-client/highlight.ts
  function applyHighlight(dataOid, color, findByOid, resolveSelection, selection) {
    const el = resolveEl(dataOid, findByOid, resolveSelection, selection);
    if (el) {
      el.style.outline = `2px solid ${color}`;
      el.style.outlineOffset = "2px";
      el.setAttribute("data-pi-highlighted", "true");
    }
  }
  function clearHighlight(dataOid, findByOid, resolveSelection, selection) {
    const el = resolveEl(dataOid, findByOid, resolveSelection, selection);
    if (el) {
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.removeAttribute("data-pi-highlighted");
    }
  }
  function reapplyAllHighlights(selections, colors, findByOid, applyHighlightFn, resolveSelection) {
    const highlighted = document.querySelectorAll("[data-pi-highlighted]");
    for (const el of highlighted) {
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.removeAttribute("data-pi-highlighted");
    }
    for (let i = 0; i < selections.length; i++) {
      applyHighlightFn(selections[i].dataOid, colors[i % colors.length], findByOid, resolveSelection, selections[i]);
    }
  }
  function resolveEl(dataOid, findByOid, resolveSelection, selection) {
    if (resolveSelection && selection) {
      return resolveSelection(selection);
    }
    return findByOid(dataOid);
  }

  // src/browser-client/widget-template.ts
  var WIDGET_CSS = `
  :host { all: initial; }
  .widget { position: fixed; bottom: 16px; right: 16px; width: 340px; background: #1e1e2e; color: #cdd6f4; border: 1px solid #45475a; border-radius: 12px; padding: 12px; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); z-index: 999999; transition: transform 0.2s ease, opacity 0.2s ease; }
  .widget.expanded { width: 520px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .title { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
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
  var WIDGET_HTML = `
  <div class="header"><div class="title"><span class="dot"></span> Pi Design Mode</div><button class="close-btn" title="Close design mode">\u2715</button></div>
  <div class="error-banner" style="display:none">\u26A0\uFE0F <span class="error-msg"></span></div>
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
  <div class="hint">Alt+Click elements to select \xB7 Enter to submit \xB7 Shift+Enter for new line</div>
  <div class="processing" style="display:none">\u23F3 Processing... <button class="cancel">Cancel</button></div>
  <div class="history-panel"><div class="history-panel-title">History</div></div>
`;

  // src/browser-client.ts
  if (typeof window !== "undefined" && !window.__piDesignInit) {
    let findByOid = function(value) {
      return document.querySelector(`[data-oid="${CSS.escape(value)}"]`) || document.querySelector(`[data-source="${CSS.escape(value)}"]`);
    }, resolveSelectionElement = function(sel) {
      if (sel.elementRef || sel.instanceIndex !== void 0 || sel.structuralSelector) {
        return resolveElement(
          sel,
          (s) => Array.from(document.querySelectorAll(s)),
          (s) => document.querySelector(s)
        );
      }
      return findByOid(sel.dataOid);
    }, computeStructuralContext2 = function() {
      return computeStructuralContext(
        selectionMod.getSelections().map((s) => s.dataOid),
        findByOid
      );
    }, persistSelections = function() {
      try {
        if (selectionMod.getSelections().length > 0) {
          const serializable = selectionMod.getSelections().map((s) => {
            const { elementRef, ...rest } = s;
            return rest;
          });
          sessionStorage.setItem("pi-design-selections", JSON.stringify(serializable));
        } else sessionStorage.removeItem("pi-design-selections");
      } catch {
      }
    }, restoreSelections = function() {
      try {
        const saved = sessionStorage.getItem("pi-design-selections");
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || parsed.length === 0 || selectionMod.getSelections().length > 0) return;
        applyRestoredSelections(parsed);
      } catch {
      }
    }, applyRestoredSelections = function(saved) {
      let found = 0;
      for (const s of saved) {
        if (selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid && x.instanceIndex === s.instanceIndex) >= 0) continue;
        const el = resolveSelectionElement(s);
        if (!el) continue;
        s.elementRef = new WeakRef(el);
        selectionMod.getSelections().push(s);
        applyHighlight2(s, SELECTION_COLORS[(selectionMod.getSelections().length - 1) % SELECTION_COLORS.length]);
        found++;
      }
      if (found > 0) {
        render();
        if (found >= saved.length) return;
      }
      const missingOids = saved.filter(
        (s) => selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid && x.instanceIndex === s.instanceIndex) < 0
      );
      if (missingOids.length === 0) return;
      restoreObserver = new MutationObserver(() => {
        const stillMissing = missingOids.filter(
          (s) => selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid && x.instanceIndex === s.instanceIndex) < 0 && !resolveSelectionElement(s)
        );
        if (stillMissing.length === missingOids.length) return;
        const nowFound = missingOids.filter(
          (s) => selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid && x.instanceIndex === s.instanceIndex) < 0 && resolveSelectionElement(s) !== null
        );
        for (const s of nowFound) {
          s.elementRef = new WeakRef(resolveSelectionElement(s));
          selectionMod.getSelections().push(s);
          applyHighlight2(s, SELECTION_COLORS[(selectionMod.getSelections().length - 1) % SELECTION_COLORS.length]);
        }
        render();
        const remaining = missingOids.filter(
          (s) => selectionMod.getSelections().findIndex((x) => x.dataOid === s.dataOid && x.instanceIndex === s.instanceIndex) < 0
        );
        if (remaining.length === 0) {
          restoreObserver == null ? void 0 : restoreObserver.disconnect();
          restoreObserver = null;
        }
      });
      restoreObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
      setTimeout(() => {
        restoreObserver == null ? void 0 : restoreObserver.disconnect();
        restoreObserver = null;
      }, 1e4);
    }, connectWS = function(sendMessage2) {
      ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      ws.onopen = () => {
        widgetState.updateConnection(true);
        reconnectAttempt = 0;
        sendMessage2.send({ type: "design:connect", url: window.location.href, title: document.title });
        if (window.__piDesignWidget) {
          window.__piDesignWidget.updateConnection(true);
        } else {
          createWidget(sendMessage2);
        }
      };
      ws.onclose = () => {
        widgetState.updateConnection(false);
        const policy = reconnectPolicy(reconnectAttempt);
        if ("giveUp" in policy) {
          if (window.__piDesignWidget) {
            window.__piDesignWidget.updateConnection(false);
            window.__piDesignWidget.showError("Disconnected \u2014 run /design to restart", true);
          }
          return;
        }
        reconnectAttempt++;
        if (window.__piDesignWidget) {
          window.__piDesignWidget.updateConnection(false);
          window.__piDesignWidget.showError("Connection lost \u2014 retrying");
        }
        setTimeout(() => connectWS(sendMessage2), policy.delay);
      };
      ws.onerror = () => {
      };
      ws.onmessage = (event) => {
        try {
          handleServerMessage(JSON.parse(event.data), sendMessage2);
        } catch {
        }
      };
    }, handleServerMessage = function(message, sendMessage2) {
      routeServerMessage(message, {
        onDisconnect: () => disconnect(sendMessage2),
        onHighlight: (oid) => highlightElement(oid),
        onProcessing: (v) => {
          if (window.__piDesignWidget) window.__piDesignWidget.setProcessing(v);
        },
        onDone: () => {
          if (window.__piDesignWidget) window.__piDesignWidget.setProcessing(false);
          if (window.__piDesignWidget) window.__piDesignWidget.flashEditedElements();
          if (window.__piDesignWidget) window.__piDesignWidget.showSuccess();
        },
        onError: (msg) => {
          if (window.__piDesignWidget) window.__piDesignWidget.setProcessing(false);
          if (window.__piDesignWidget) window.__piDesignWidget.showError(msg);
        }
      });
    }, applyHighlight2 = function(sel, color) {
      applyHighlight(sel.dataOid, color, findByOid, resolveSelectionElement, sel);
    }, clearHighlight2 = function(sel) {
      clearHighlight(sel.dataOid, findByOid, resolveSelectionElement, sel);
    }, reapplyAllHighlights2 = function() {
      reapplyAllHighlights(selectionMod.getSelections(), SELECTION_COLORS, findByOid, applyHighlight, resolveSelectionElement);
    }, addSelection = function(sel, sendMessage2) {
      selectionMod.setSendMessage(sendMessage2);
      return selectionMod.addSelection(sel);
    }, removeSelection = function(dataOid, instanceIndex, sendMessage2) {
      selectionMod.setSendMessage(sendMessage2);
      selectionMod.removeSelection(dataOid, instanceIndex);
    }, clearAllSelections = function(sendMessage2) {
      selectionMod.setSendMessage(sendMessage2);
      selectionMod.clearAllSelections();
    }, flashElement = function(sel) {
      const el = sel ? resolveSelectionElement(sel) : (sel == null ? void 0 : sel.dataOid) ? findByOid(sel.dataOid) : null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const orig = el.style.outlineOffset;
      el.style.transition = "outline-offset 0.15s ease";
      el.style.outlineOffset = "8px";
      setTimeout(() => {
        el.style.outlineOffset = orig || "2px";
        setTimeout(() => {
          el.style.transition = "";
        }, 200);
      }, 200);
    }, createWidget = function(sendMessage2) {
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
      dot = shadow.querySelector(".dot");
      closeBtn = shadow.querySelector(".close-btn");
      selectionsContainer = shadow.querySelector(".selections");
      input = shadow.querySelector("textarea");
      submitBtn = shadow.querySelector(".submit-btn");
      processingEl = shadow.querySelector(".processing");
      errorBanner = shadow.querySelector(".error-banner");
      errorMsg = shadow.querySelector(".error-msg");
      historyDropdown = shadow.querySelector(".history-panel");
      cancelBtn = shadow.querySelector(".cancel");
      quickActions = shadow.querySelector(".quick-actions");
      qaMultiBtns = shadow.querySelectorAll(".qa-btn[data-multi]");
      hint = shadow.querySelector(".hint");
      historyMod = createHistory({ localStorage, input, historyDropdown });
      closeBtn.addEventListener("click", () => disconnect(sendMessage2));
      errorBanner.addEventListener("click", () => {
        errorBanner.style.display = "none";
        if (errorBannerTimer) clearTimeout(errorBannerTimer);
      });
      input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submitBtn.click();
        }
      });
      input.addEventListener("focus", () => {
        widget.classList.add("expanded");
        historyMod.showHistory();
      });
      input.addEventListener("blur", () => {
        widget.classList.remove("expanded");
        setTimeout(() => {
          historyDropdown.style.display = "none";
        }, 200);
      });
      historyDropdown.addEventListener("mousedown", (e) => {
        const item = e.target.closest(".history-item");
        const clearEl = e.target.closest(".history-clear");
        if (item) {
          input.value = item.textContent || "";
          historyDropdown.style.display = "none";
          input.focus();
        }
        if (clearEl) {
          historyMod.clearHistory();
          historyDropdown.style.display = "none";
        }
      });
      cancelBtn.addEventListener("click", () => {
        sendMessage2.send({ type: "design:deselect", dataOid: "__all__" });
        widgetState.setProcessing(false);
        processingEl.style.display = "none";
        cancelBtn.style.display = "none";
        if (processingTimer) {
          clearTimeout(processingTimer);
          processingTimer = null;
        }
        reapplyAllHighlights2();
        render();
      });
      const qaInstructions = {
        center: "Center these elements",
        fullwidth: "Make these elements full width",
        "equal-spacing": "Add equal spacing between these elements",
        "same-size": "Make these elements the same size",
        revert: "Revert the design changes you just made"
      };
      quickActions.addEventListener("click", (e) => {
        const btn = e.target.closest(".qa-btn");
        if (!btn || widgetState.isProcessing()) return;
        const action = btn.getAttribute("data-action");
        if (action && qaInstructions[action]) {
          input.value = qaInstructions[action];
          submitBtn.click();
        }
      });
      submitBtn.addEventListener("click", () => {
        if (selectionMod.getSelections().length === 0 || widgetState.isProcessing()) return;
        const instruction = input.value.trim();
        if (!instruction) return;
        historyMod.saveHistory(instruction);
        const structuralContext = computeStructuralContext2();
        submittedOids = selectionMod.getSelections().map((s) => s.dataOid);
        sendMessage2.send({
          type: "design:submit",
          selections: selectionMod.getSelections().map((s) => ({
            dataOid: s.dataOid,
            instanceIndex: s.instanceIndex,
            structuralSelector: s.structuralSelector
          })),
          instruction,
          structuralContext
        });
        input.value = "";
        input.style.height = "auto";
        widgetState.setProcessing(true);
        lastSelections = selectionMod.getSelections().slice();
        processingEl.style.display = "block";
        render();
      });
      render();
      window.__piDesignWidget = {
        addSelection(data) {
          return addSelection(data, sendMessage2);
        },
        removeSelection(dataOid) {
          removeSelection(dataOid, sendMessage2);
        },
        clearAllSelections() {
          clearAllSelections(sendMessage2);
        },
        setProcessing(value) {
          widgetState.setProcessing(value);
          processingEl.style.display = value ? "block" : "none";
          cancelBtn.style.display = "none";
          if (processingTimer) {
            clearTimeout(processingTimer);
            processingTimer = null;
          }
          if (value) {
            submittedOids = selectionMod.getSelections().map((s) => s.dataOid);
            for (const sel of selectionMod.getSelections()) clearHighlight2(sel);
            processingTimer = setTimeout(() => {
              if (widgetState.isProcessing()) cancelBtn.style.display = "inline";
            }, 6e4);
          }
          if (!value) reapplyAllHighlights2();
          render();
        },
        isConnected() {
          return sendMessage2.isConnected();
        },
        flashEditedElements,
        showSuccess,
        showError,
        updateConnection(connected) {
          widgetState.updateConnection(connected);
          if (dot) {
            dot.className = "dot" + (connected ? " connected" : "");
            dot.title = connected ? "Connected to Pi" : "Disconnected \u2014 changes won't be sent";
          }
          if (submitBtn) submitBtn.disabled = !connected || selectionMod.getSelections().length === 0 || widgetState.isProcessing();
          if (input) input.disabled = !connected || widgetState.isProcessing();
          if (connected && errorBanner) errorBanner.style.display = "none";
          render();
        },
        destroy: destroyWidget
      };
      restoreSelections();
    }, render = function() {
      if (!shadow) return;
      dot.className = "dot" + (widgetState.isConnected() ? " connected" : "");
      dot.title = widgetState.isConnected() ? "Connected to Pi" : "Disconnected \u2014 changes won't be sent";
      submitBtn.disabled = selectionMod.getSelections().length === 0 || widgetState.isProcessing();
      input.disabled = widgetState.isProcessing();
      quickActions.style.display = selectionMod.getSelections().length > 0 && !widgetState.isProcessing() ? "flex" : "none";
      qaMultiBtns.forEach((btn) => {
        btn.style.display = selectionMod.getSelections().length >= 2 ? "" : "none";
      });
      processingEl.style.display = widgetState.isProcessing() ? "block" : "none";
      selectionsContainer.innerHTML = "";
      for (let i = 0; i < selectionMod.getSelections().length; i++) {
        const sel = selectionMod.getSelections()[i];
        const color = SELECTION_COLORS[i % SELECTION_COLORS.length];
        const parsed = parseDataOid(sel.dataOid);
        const location = parsed ? `${parsed.filePath}:${parsed.line}` : sel.dataOid;
        const instanceLabel = sel.instanceIndex > 0 ? ` #${sel.instanceIndex + 1}` : "";
        const item = document.createElement("div");
        item.className = "selection-item";
        item.innerHTML = `<span class="color-dot" style="background:${color}"></span><span class="tag">&lt;${escapeHtml(sel.tagName)}&gt;${instanceLabel}</span><span class="file">${escapeHtml(location)}</span><button class="remove" data-oid="${escapeHtml(sel.dataOid)}" data-instance="${sel.instanceIndex ?? 0}">\xD7</button>`;
        item.querySelector(".remove").addEventListener("click", (e) => {
          e.stopPropagation();
          removeSelection(sel.dataOid, sel.instanceIndex, { send(msg) {
            if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
          }, isConnected() {
            return ws !== null && ws.readyState === WebSocket.OPEN;
          } });
        });
        item.addEventListener("click", () => flashElement(sel));
        selectionsContainer.appendChild(item);
      }
      if (selectionMod.getSelections().length === 0) {
        selectionsContainer.innerHTML = '<div style="color:#6c7086;font-size:12px;padding:4px 0;">No element selected</div>';
      }
    }, flashEditedElements = function() {
      if (submittedOids.length === 0) return;
      let flashed = 0;
      for (const oid of submittedOids) {
        const sel = selectionMod.getSelections().find((s) => s.dataOid === oid);
        const el = sel ? resolveSelectionElement(sel) : findByOid(oid);
        if (el) {
          flashed++;
          el.style.outline = "2px solid #a6e3a1";
          el.style.outlineOffset = "2px";
          ((element, dataOid) => {
            setTimeout(() => {
              const selIdx = selectionMod.getSelections().findIndex((s) => s.dataOid === dataOid);
              if (selIdx >= 0) {
                applyHighlight2(selectionMod.getSelections()[selIdx], SELECTION_COLORS[selIdx % SELECTION_COLORS.length]);
              } else {
                element.style.outline = "";
                element.style.outlineOffset = "";
              }
            }, 2e3);
          })(el, oid);
        }
      }
      console.log(`[pi-design] Flashed ${flashed}/${submittedOids.length} elements`);
      submittedOids = [];
    }, showSuccess = function() {
      if (hint) {
        hint.textContent = "\u2713 Changes applied";
        hint.style.color = "#a6e3a1";
        setTimeout(() => {
          hint.textContent = "Alt+Click to select \xB7 Alt+R recall \xB7 Esc to clear";
          hint.style.color = "";
        }, 3e3);
      }
    }, showError = function(message, persistent = false) {
      if (!errorBanner || !errorMsg) return;
      errorMsg.textContent = message;
      errorBanner.style.display = "flex";
      if (errorBannerTimer) clearTimeout(errorBannerTimer);
      if (!persistent) {
        errorBannerTimer = setTimeout(() => {
          errorBanner.style.display = "none";
        }, 1e4);
      }
    }, destroyWidget = function() {
      if (processingTimer) {
        clearTimeout(processingTimer);
        processingTimer = null;
      }
      if (errorBannerTimer) {
        clearTimeout(errorBannerTimer);
        errorBannerTimer = null;
      }
      if (restoreObserver) {
        restoreObserver.disconnect();
        restoreObserver = null;
      }
      const host = document.getElementById(WIDGET_ID);
      if (host) host.remove();
      delete window.__piDesignWidget;
      hideHoverTooltip();
    }, highlightElement = function(dataOid) {
      const el = findByOid(dataOid);
      if (el) {
        el.style.outline = "2px solid #3b82f6";
        el.style.outlineOffset = "2px";
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, showHoverTooltip = function(dataOid, x, y) {
      const parsed = parseDataOid(dataOid);
      const location = parsed ? `${parsed.filePath}:${parsed.line}` : dataOid;
      const el = findByOid(dataOid);
      const tag = el ? el.tagName.toLowerCase() : "";
      const label = tag ? `<${tag}>` : "";
      hoverTooltipMod.show(label, location, x, y);
    }, hideHoverTooltip = function() {
      hoverTooltipMod.hide();
    }, handleAltClick = function(e) {
      if (!isAltDown) return;
      const target = e.target.closest("[data-oid],[data-source]");
      if (!target || e.target.closest(`#${WIDGET_ID}`)) return;
      e.preventDefault();
      e.stopPropagation();
      const dataOid = target.getAttribute("data-oid") || target.getAttribute("data-source");
      if (!dataOid) return;
      const sendMessage2 = {
        send(msg) {
          if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
        },
        isConnected() {
          return ws !== null && ws.readyState === WebSocket.OPEN;
        }
      };
      const selectionData = buildSelectionData(target, {
        getSelector,
        getComputedStyles,
        getBoundingBox,
        querySelectorAll: (s) => Array.from(document.querySelectorAll(s)),
        cssEscape: CSS.escape,
        bodyElement: document.body
      });
      const wasAdded = addSelection(selectionData, sendMessage2);
      if (wasAdded && ws && widgetState.isConnected()) {
        sendMessage2.send({
          type: "design:select",
          dataOid: selectionData.dataOid,
          instanceIndex: selectionData.instanceIndex,
          structuralSelector: selectionData.structuralSelector,
          selector: selectionData.selector,
          computedStyles: selectionData.computedStyles,
          boundingBox: selectionData.boundingBox,
          tagName: selectionData.tagName,
          textContent: selectionData.textContent
        });
      }
    }, disconnect = function(sendMessage2) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        sendMessage2.send({ type: "design:disconnect" });
      }
      if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
        widgetState.updateConnection(false);
      }
      sessionStorage.removeItem("pi-design-selections");
      destroyWidget();
    };
    window.__piDesignInit = true;
    const WS_PORT = window.__PI_DESIGN_PORT || 9481;
    const SELECTION_COLORS = ["#f38ba8", "#a6e3a1", "#89b4fa", "#f9e2af", "#cba6f7", "#94e2d5", "#fab387", "#74c7ec"];
    const widgetState = createWidgetState();
    let isAltDown = false;
    let lastSelections = [];
    let submittedOids = [];
    let processingTimer = null;
    let errorBannerTimer = null;
    let restoreObserver = null;
    let reconnectAttempt = 0;
    let selectionMod;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Alt") isAltDown = true;
    });
    document.addEventListener("keyup", (e) => {
      if (e.key === "Alt") {
        isAltDown = false;
        hideHoverTooltip();
      }
    });
    document.addEventListener("blur", () => {
      isAltDown = false;
      hideHoverTooltip();
    });
    let historyMod = createHistory({ localStorage, input: null, historyDropdown: null });
    let ws = null;
    selectionMod = createSelectionManager({
      applyHighlight: (sel) => applyHighlight2(sel, SELECTION_COLORS[(selectionMod.getSelections().length - 1) % SELECTION_COLORS.length]),
      clearHighlight: clearHighlight2,
      reapplyAllHighlights: reapplyAllHighlights2,
      persistSelections
    });
    const WIDGET_ID = "pi-design-widget";
    let widgetHost = null;
    let shadow;
    let dot;
    let closeBtn;
    let selectionsContainer;
    let input;
    let submitBtn;
    let processingEl;
    let errorBanner;
    let errorMsg;
    let historyDropdown;
    let cancelBtn;
    let quickActions;
    let qaMultiBtns;
    let hint;
    selectionMod.setRender(render);
    const hoverTooltipMod = createHoverTooltip({ document, escapeHtml });
    document.addEventListener("click", handleAltClick, true);
    document.addEventListener("mouseover", (e) => {
      if (!isAltDown || !window.__piDesignWidget) return;
      const target = e.target.closest("[data-oid],[data-source]");
      if (!target) {
        hideHoverTooltip();
        return;
      }
      const dataOid = target.getAttribute("data-oid") || target.getAttribute("data-source");
      if (dataOid) showHoverTooltip(dataOid, e.clientX, e.clientY);
    });
    document.addEventListener("mousemove", (e) => {
      const tooltipEl = hoverTooltipMod.getEl();
      if (!isAltDown || !tooltipEl || tooltipEl.style.display === "none") return;
      if (!e.target.closest("[data-oid],[data-source]")) {
        hideHoverTooltip();
        return;
      }
      tooltipEl.style.left = e.clientX + 12 + "px";
      tooltipEl.style.top = e.clientY + 12 + "px";
    });
    document.addEventListener("mouseout", (e) => {
      if (!e.target.closest("[data-oid],[data-source]")) return;
      if (!e.relatedTarget || !e.relatedTarget.closest("[data-oid],[data-source]")) hideHoverTooltip();
    });
    document.addEventListener("keydown", (e) => {
      const sendMessage2 = {
        send(msg) {
          if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
        },
        isConnected() {
          return ws !== null && ws.readyState === WebSocket.OPEN;
        }
      };
      if (e.key === "Escape" && !e.altKey && document.activeElement !== input) {
        clearAllSelections(sendMessage2);
      }
      if (e.key === "r" && e.altKey && !e.ctrlKey && !e.metaKey && window.__piDesignWidget && selectionMod.getSelections().length === 0 && lastSelections.length > 0 && !widgetState.isProcessing()) {
        e.preventDefault();
        for (const sel of lastSelections) {
          const el = resolveSelectionElement(sel);
          if (!el) continue;
          addSelection(sel, sendMessage2);
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          ((element) => {
            element.style.outlineOffset = "6px";
            setTimeout(() => {
              element.style.outlineOffset = "2px";
            }, 400);
          })(el);
        }
      }
    });
    const sendMessage = {
      send(msg) {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      },
      isConnected() {
        return ws !== null && ws.readyState === WebSocket.OPEN;
      }
    };
    window.addEventListener("beforeunload", () => {
      if (ws && widgetState.isConnected()) sendMessage.send({ type: "design:disconnect" });
      if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
        widgetState.updateConnection(false);
      }
      destroyWidget();
    });
    connectWS(sendMessage);
  }
})();
//# sourceMappingURL=browser-client.js.map