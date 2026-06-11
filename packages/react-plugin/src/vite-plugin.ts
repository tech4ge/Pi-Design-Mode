import { injectDataOid } from "./transform.js";
import type { Plugin } from "vite";

const VIRTUAL_CLIENT_ID = "virtual:pi-design-client";
const VIRTUAL_CLIENT_RESOLVED = "\0" + VIRTUAL_CLIENT_ID;

interface PiDesignViteOptions {
  projectRoot: string;
  wsPort?: number;
}

/**
 * Vite plugin for Pi Design Mode.
 *
 * 1. Injects data-oid attributes on every JSX element during dev mode.
 * 2. Injects the client script as a virtual module so the browser
 *    connects to the WS server, handles Alt+Click, and renders the widget.
 */
export function piDesignVitePlugin(options: PiDesignViteOptions): Plugin {
  return {
    name: "pi-design-react-plugin",
    enforce: "pre",
    apply: "serve", // Dev mode only

    resolveId(source) {
      if (source === VIRTUAL_CLIENT_ID) {
        return VIRTUAL_CLIENT_RESOLVED;
      }
    },

    load(id) {
      if (id === VIRTUAL_CLIENT_RESOLVED) {
        return generateClientScript(options.wsPort ?? 9481);
      }
    },

    transform(code: string, id: string) {
      // Skip node_modules
      if (id.includes("node_modules")) return null;

      // Inject client script import into the app entry point (main.tsx/index.tsx)
      if (/\/main\.(tsx|jsx|ts|js)$/.test(id) || /\/index\.(tsx|jsx)$/.test(id)) {
        const clientImport = `import "${VIRTUAL_CLIENT_ID}";\n`;
        return {
          code: clientImport + code,
          map: null,
        };
      }

      // Transform TSX/JSX files with data-oid injection
      if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) return null;

      const result = injectDataOid(code, id, options.projectRoot);

      return {
        code: result,
        map: null, // TODO: generate source map
      };
    },
  };
}

function generateClientScript(wsPort: number): string {
  return `
// Pi Design Mode — Client Script (auto-generated)
const WS_PORT = ${wsPort};
const HIGHLIGHT_STYLE_ID = "pi-design-highlight-style";
const WIDGET_ID = "pi-design-widget";
const SELECTION_COLORS = ["#f38ba8", "#a6e3a1", "#89b4fa", "#f9e2af", "#cba6f7", "#94e2d5", "#fab387", "#74c7ec"];
var processingTimer = null;
var errorBannerTimer = null;

// --- parseDataOid (browser-safe, no crypto module) ---
function parseDataOid(oid) {
  const parts = oid.split(":");
  if (parts.length !== 6 || parts[0] !== "c" || parts[2] !== "r") return null;
  return { marker: parts[0], projectHash: parts[1], relativeMarker: parts[2], filePath: parts[3], line: parseInt(parts[4], 10), column: parseInt(parts[5], 10) };
}

// --- Widget ---
function createWidget(sendMessage) {
  if (document.getElementById(WIDGET_ID)) return;
  const host = document.createElement("div");
  host.id = WIDGET_ID;
  host.style.cssText = "position:fixed;bottom:16px;right:16px;z-index:999999;font-family:system-ui,sans-serif;";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = \`
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
    .history-panel { position: absolute; top: 0; right: 100%; bottom: 0; width: 200px; background: #1e1e2e; border: 1px solid #45475a; border-right: none; border-radius: 12px 0 0 12px; padding: 8px 0; overflow-y: auto; display: none; flex-direction: column; box-shadow: -4px 0 16px rgba(0,0,0,0.2); }
    .history-panel-title { padding: 4px 10px 8px; font-size: 11px; color: #6c7086; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .history-item { padding: 6px 10px; font-size: 12px; color: #cdd6f4; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .history-item:hover { background: #313244; }
    .history-clear { padding: 8px 10px; font-size: 11px; color: #f38ba8; cursor: pointer; text-align: center; border-top: 1px solid #313244; margin-top: auto; }
    .history-clear:hover { background: #313244; }
  \`;
  const widget = document.createElement("div");
  widget.className = "widget";
  widget.innerHTML = \`
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
    <div class="hint">Alt+Click to select · Esc to clear</div>
    <div class="history-panel" style="display:none"><div class="history-panel-title">Recent</div></div>
  \`;
  shadow.appendChild(style);
  shadow.appendChild(widget);

  const dot = shadow.querySelector(".dot");
  const closeBtn = shadow.querySelector(".close-btn");
  const selectionsContainer = shadow.querySelector(".selections");
  const input = shadow.querySelector("textarea");
  const submitBtn = shadow.querySelector(".submit-btn");
  const processingEl = shadow.querySelector(".processing");
const errorBanner = shadow.querySelector(".error-banner");
const errorMsg = shadow.querySelector(".error-msg");
const historyDropdown = shadow.querySelector(".history-panel");
const cancelBtn = shadow.querySelector(".cancel");
const quickActions = shadow.querySelector(".quick-actions");
const qaMultiBtns = shadow.querySelectorAll(".qa-btn[data-multi]");

  let selections = [];
  let submittedOids = [];
  let isProcessing = false;

  function persistSelections() {
    try {
      if (selections.length > 0) {
        sessionStorage.setItem("pi-design-selections", JSON.stringify(selections));
      } else {
        sessionStorage.removeItem("pi-design-selections");
      }
    } catch(e) {}
  }

  function restoreSelections() {
    try {
      var saved = sessionStorage.getItem("pi-design-selections");
      if (!saved) return;
      var parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;
      for (var i = 0; i < parsed.length; i++) {
        var s = parsed[i];
        var el = document.querySelector('[data-oid="' + CSS.escape(s.dataOid) + '"]');
        if (!el) continue; // skip elements no longer in DOM
        if (selections.findIndex(function(x) { return x.dataOid === s.dataOid; }) >= 0) continue; // already selected
        selections.push(s);
        applyHighlight(s.dataOid, SELECTION_COLORS[(selections.length - 1) % SELECTION_COLORS.length]);
      }
      if (selections.length > 0) render();
      persistSelections(); // re-persist with only valid entries
    } catch(e) {}
  }

  function getHistory() {
    try {
      var h = localStorage.getItem("pi-design-history");
      return h ? JSON.parse(h) : [];
    } catch(e) { return []; }
  }

  function saveHistory(instruction) {
    if (!instruction.trim()) return;
    var h = getHistory();
    // Remove duplicate if exists, then prepend
    h = h.filter(function(x) { return x !== instruction; });
    h.unshift(instruction);
    if (h.length > 20) h = h.slice(0, 20);
    try { localStorage.setItem("pi-design-history", JSON.stringify(h)); } catch(e) {}
  }

  function showHistory() {
    var h = getHistory();
    if (h.length === 0 || input.value.length > 0) { historyDropdown.style.display = "none"; return; }
    // Keep the title, remove everything after it
    var title = historyDropdown.querySelector(".history-panel-title");
    historyDropdown.innerHTML = "";
    historyDropdown.appendChild(title);
    for (var i = 0; i < h.length; i++) {
      var item = document.createElement("div");
      item.className = "history-item";
      item.textContent = h[i];
      historyDropdown.appendChild(item);
    }
    var clearEl = document.createElement("div");
    clearEl.className = "history-clear";
    clearEl.textContent = "Clear history";
    historyDropdown.appendChild(clearEl);
    historyDropdown.style.display = "flex";
  }

  function render() {
    dot.className = "dot" + (sendMessage.isConnected() ? " connected" : "");
    dot.title = sendMessage.isConnected() ? "Connected to Pi" : "Disconnected — changes won't be sent";
    submitBtn.disabled = selections.length === 0 || isProcessing;
    input.disabled = isProcessing;
    quickActions.style.display = selections.length > 0 && !isProcessing ? "flex" : "none";
    for (var m = 0; m < qaMultiBtns.length; m++) {
      qaMultiBtns[m].style.display = selections.length >= 2 ? "" : "none";
    }
    selectionsContainer.innerHTML = "";
    for (let i = 0; i < selections.length; i++) {
      let sel = selections[i];
      let color = SELECTION_COLORS[i % SELECTION_COLORS.length];
      var item = document.createElement("div");
      item.className = "selection-item";
      var parsed = sendMessage.parseDataOid(sel.dataOid);
      var location = parsed ? parsed.filePath + ":" + parsed.line : sel.dataOid;
      var escapeHtml = function(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); };
      item.innerHTML = '<span class="color-dot" style="background:' + color + '"></span><span class="tag">&lt;' + escapeHtml(sel.tagName) + '&gt;</span><span class="file">' + escapeHtml(location) + '</span><button class="remove" data-oid="' + escapeHtml(sel.dataOid) + '">×</button>';
      item.querySelector(".remove").addEventListener("click", function(e) { e.stopPropagation(); removeSelection(sel.dataOid); });
      item.addEventListener("click", function() { flashElement(sel.dataOid); });
      selectionsContainer.appendChild(item);
    }
    if (selections.length === 0) {
      selectionsContainer.innerHTML = '<div style="color:#6c7086;font-size:12px;padding:4px 0;">No element selected</div>';
    }
  }

  function applyHighlight(dataOid, color) {
    var el = document.querySelector('[data-oid="' + CSS.escape(dataOid) + '"]');
    if (el) {
      el.style.outline = "2px solid " + color;
      el.style.outlineOffset = "2px";
      el.setAttribute("data-pi-highlighted", "true");
    }
  }

  function clearHighlight(dataOid) {
    var el = document.querySelector('[data-oid="' + CSS.escape(dataOid) + '"]');
    if (el) {
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.removeAttribute("data-pi-highlighted");
    }
  }

  function flashElement(dataOid) {
    var el = document.querySelector('[data-oid="' + CSS.escape(dataOid) + '"]');
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Pulse: grow outline offset then shrink back
    var orig = el.style.outlineOffset;
    el.style.transition = "outline-offset 0.15s ease";
    el.style.outlineOffset = "8px";
    setTimeout(function() {
      el.style.outlineOffset = orig || "2px";
      setTimeout(function() { el.style.transition = ""; }, 200);
    }, 200);
  }

  function removeSelection(dataOid) {
    selections = selections.filter(function(s) { return s.dataOid !== dataOid; });
    clearHighlight(dataOid);
    sendMessage.send({ type: "design:deselect", dataOid: dataOid });
    persistSelections();
    // Re-apply colors after removal (indices may shift)
    reapplyAllHighlights();
    render();
  }

  function clearAllSelections() {
    for (var i = 0; i < selections.length; i++) {
      clearHighlight(selections[i].dataOid);
    }
    selections = [];
    sendMessage.send({ type: "design:deselect", dataOid: "__all__" });
    persistSelections();
    render();
  }

  function flashEditedElements() {
    if (submittedOids.length === 0) return;
    // By the time design:done arrives, HMR has already re-rendered.
    // Flash the new elements immediately.
    var flashed = 0;
    for (var i = 0; i < submittedOids.length; i++) {
      var el = document.querySelector('[data-oid="' + CSS.escape(submittedOids[i]) + '"]');
      if (el) {
        flashed++;
        el.style.outline = "2px solid #a6e3a1";
        el.style.outlineOffset = "2px";
        (function(element, oid, idx) {
          setTimeout(function() {
            // After flash, re-apply selection color if still selected
            var selIdx = -1;
            for (var j = 0; j < selections.length; j++) {
              if (selections[j].dataOid === oid) { selIdx = j; break; }
            }
            if (selIdx >= 0) {
              applyHighlight(oid, SELECTION_COLORS[selIdx % SELECTION_COLORS.length]);
            } else {
              element.style.outline = "";
              element.style.outlineOffset = "";
            }
          }, 2000);
        })(el, submittedOids[i], i);
      }
    }
    console.log("[pi-design] Flashed " + flashed + "/" + submittedOids.length + " elements");
    submittedOids = [];
  }

  function showSuccess() {
    var hint = shadow.querySelector(".hint");
    if (hint) {
      hint.textContent = "✓ Changes applied";
      hint.style.color = "#a6e3a1";
      setTimeout(function() {
        hint.textContent = "Alt+Click to select · Esc to clear";
        hint.style.color = "";
      }, 3000);
    }
  }

  function showError(message) {
    if (!errorBanner || !errorMsg) return;
    errorMsg.textContent = message;
    errorBanner.style.display = "flex";
    if (errorBannerTimer) clearTimeout(errorBannerTimer);
    errorBannerTimer = setTimeout(function() {
      errorBanner.style.display = "none";
    }, 10000);
  }

  function reapplyAllHighlights() {
    // Clear all then re-apply with correct color indices
    var highlighted = document.querySelectorAll("[data-pi-highlighted]");
    for (var j = 0; j < highlighted.length; j++) {
      highlighted[j].style.outline = "";
      highlighted[j].style.outlineOffset = "";
      highlighted[j].removeAttribute("data-pi-highlighted");
    }
    for (var i = 0; i < selections.length; i++) {
      applyHighlight(selections[i].dataOid, SELECTION_COLORS[i % SELECTION_COLORS.length]);
    }
  }

  function computeStructuralContext() {
    if (selections.length <= 1) return { siblings: [], sameComponent: [] };
    var oids = selections.map(function(s) { return s.dataOid; });
    // Group by parent element (siblings) — use Map with DOM reference as key
    var parentMap = new Map();
    for (var i = 0; i < oids.length; i++) {
      var el = document.querySelector('[data-oid="' + CSS.escape(oids[i]) + '"]');
      if (el && el.parentElement) {
        if (!parentMap.has(el.parentElement)) parentMap.set(el.parentElement, []);
        parentMap.get(el.parentElement).push(oids[i]);
      }
    }
    var siblings = [];
    parentMap.forEach(function(group) {
      if (group.length > 1) siblings.push(group);
    });
    // Group by file path (sameComponent)
    var fileMap = {};
    for (var j = 0; j < oids.length; j++) {
      var parsed = parseDataOid(oids[j]);
      var fileKey = parsed ? parsed.filePath : oids[j];
      if (!fileMap[fileKey]) fileMap[fileKey] = [];
      fileMap[fileKey].push(oids[j]);
    }
    var sameComponent = [];
    var fileKeys = Object.keys(fileMap);
    for (var f = 0; f < fileKeys.length; f++) {
      if (fileMap[fileKeys[f]].length > 1) sameComponent.push(fileMap[fileKeys[f]]);
    }
    return { siblings: siblings, sameComponent: sameComponent };
  }

  submitBtn.addEventListener("click", function() {
    if (selections.length === 0 || isProcessing) return;
    var instruction = input.value.trim();
    if (!instruction) return;
    saveHistory(instruction);
    var structuralContext = computeStructuralContext();
    sendMessage.send({
      type: "design:submit",
      selections: selections.map(function(s) { return s.dataOid; }),
      instruction: instruction,
      structuralContext: structuralContext,
    });
    input.value = "";
    input.style.height = "auto";
    isProcessing = true;
    processingEl.style.display = "block";
    render();
  });

  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  }

  input.addEventListener("input", autoGrow);

  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitBtn.click(); }
  });

  input.addEventListener("focus", function() { widget.classList.add("expanded"); showHistory(); });
  input.addEventListener("blur", function() { widget.classList.remove("expanded"); setTimeout(function() { historyDropdown.style.display = "none"; }, 200); });

  closeBtn.addEventListener("click", function() { disconnect(); });

errorBanner.addEventListener("click", function() {
  errorBanner.style.display = "none";
  if (errorBannerTimer) clearTimeout(errorBannerTimer);
});

historyDropdown.addEventListener("mousedown", function(e) {
  var item = e.target.closest(".history-item");
  var clearEl = e.target.closest(".history-clear");
  if (item) {
    input.value = item.textContent;
    historyDropdown.style.display = "none";
    input.focus();
  }
  if (clearEl) {
    try { localStorage.removeItem("pi-design-history"); } catch(e) {}
    historyDropdown.style.display = "none";
  }
});

cancelBtn.addEventListener("click", function() {
  sendMessage.send({ type: "design:deselect", dataOid: "__all__" });
  isProcessing = false;
  processingEl.style.display = "none";
  cancelBtn.style.display = "none";
  if (processingTimer) { clearTimeout(processingTimer); processingTimer = null; }
  reapplyAllHighlights();
  render();
});

var qaInstructions = {
  center: "Center these elements",
  fullwidth: "Make these elements full width",
  "equal-spacing": "Add equal spacing between these elements",
  "same-size": "Make these elements the same size",
  revert: "Revert the design changes you just made"
};
quickActions.addEventListener("click", function(e) {
  var btn = e.target.closest(".qa-btn");
  if (!btn || isProcessing) return;
  var action = btn.getAttribute("data-action");
  if (action && qaInstructions[action]) {
    input.value = qaInstructions[action];
    submitBtn.click();
  }
});  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && !e.altKey && document.activeElement !== input) {
      clearAllSelections();
    }
  });

  window.__piDesignWidget = {
    addSelection: function(data) {
      var existing = selections.findIndex(function(s) { return s.dataOid === data.dataOid; });
      if (existing !== -1) {
        // Already selected — deselect it (toggle)
        removeSelection(data.dataOid);
        return false;
      }
      selections.push(data);
      var color = SELECTION_COLORS[(selections.length - 1) % SELECTION_COLORS.length];
      applyHighlight(data.dataOid, color);
      persistSelections();
      render();
      return true;
    },
    removeSelection: removeSelection,
    clearAllSelections: clearAllSelections,
    setProcessing: function(value) {
      isProcessing = value;
      processingEl.style.display = value ? "block" : "none";
      cancelBtn.style.display = "none";
      if (processingTimer) { clearTimeout(processingTimer); processingTimer = null; }
      if (value) {
        // Stash submitted data-oids for post-edit flash
        // (must survive setProcessing(false) call)
        submittedOids = selections.map(function(s) { return s.dataOid; });
        // Hide outlines during processing (clean screen), but keep selections
        for (var i = 0; i < selections.length; i++) { clearHighlight(selections[i].dataOid); }
        // Show cancel button after 60s if still processing
        processingTimer = setTimeout(function() {
          if (isProcessing) cancelBtn.style.display = "inline";
        }, 60000);
      }
      if (!value) {
        // Re-apply outlines on the (possibly new) elements after HMR
        reapplyAllHighlights();
      }
      render();
    },
    isConnected: function() { return sendMessage.isConnected(); },
    flashEditedElements: flashEditedElements,
    showSuccess: showSuccess,
showError: showError,
updateConnection: function(connected) {
  isConnected = connected;
  dot.className = "dot" + (connected ? " connected" : "");
  dot.title = connected ? "Connected to Pi" : "Disconnected — changes won't be sent";
  submitBtn.disabled = !connected || selections.length === 0 || isProcessing;
  input.disabled = !connected || isProcessing;
  if (connected && errorBanner) errorBanner.style.display = "none";
  render();
},
    destroy: destroyWidget,
  };
  render();
  // Restore selections from previous session (e.g. after page reload)
  restoreSelections();
}

function destroyWidget() {
  if (processingTimer) { clearTimeout(processingTimer); processingTimer = null; }
  if (errorBannerTimer) { clearTimeout(errorBannerTimer); errorBannerTimer = null; }
  var host = document.getElementById(WIDGET_ID);
  if (host) host.remove();
  delete window.__piDesignWidget;
  hideHoverTooltip();
}

// --- Connection ---
var ws = null;
var isConnected = false;

function connect() {
  var url = "ws://localhost:" + WS_PORT;
  ws = new WebSocket(url);
  ws.onopen = function() {
    isConnected = true;
    ws.send(JSON.stringify({ type: "design:connect", url: window.location.href, title: document.title }));
    if (window.__piDesignWidget) {
      // Reuse existing widget — update connection state and clear error
      window.__piDesignWidget.updateConnection(true);
    } else {
      createWidget({
        send: function(message) { if (ws && isConnected) ws.send(JSON.stringify(message)); },
        isConnected: function() { return isConnected; },
        parseDataOid: parseDataOid,
      });
    }
  };
  ws.onclose = function() {
    isConnected = false;
    if (window.__piDesignWidget) {
      // Keep widget alive — show disconnected state
      window.__piDesignWidget.updateConnection(false);
      window.__piDesignWidget.showError("Connection lost — will retry");
    }
    setTimeout(connect, 2000);
  };
  ws.onmessage = function(event) {
    try { handleServerMessage(JSON.parse(event.data)); } catch {}
  };
}

function handleServerMessage(message) {
  switch (message.type) {
    case "design:mode:off": disconnect(); break;
    case "design:highlight": highlightElement(message.dataOid); break;
    case "design:processing":
      if (window.__piDesignWidget) window.__piDesignWidget.setProcessing(true);
      break;
    case "design:done":
      if (window.__piDesignWidget) window.__piDesignWidget.setProcessing(false);
      if (window.__piDesignWidget) window.__piDesignWidget.flashEditedElements();
      if (window.__piDesignWidget) window.__piDesignWidget.showSuccess();
      break;
    case "design:error":
      if (window.__piDesignWidget) window.__piDesignWidget.setProcessing(false);
      if (window.__piDesignWidget) window.__piDesignWidget.showError(message.message || "Unknown error");
      break;
  }
}

function disconnect() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "design:disconnect" }));
  }
  if (ws) { ws.onclose = null; ws.close(); ws = null; isConnected = false; }
  sessionStorage.removeItem("pi-design-selections");
  destroyWidget();
}

// --- Element Selection ---
function handleAltClick(event) {
  if (!event.altKey) return;
  event.preventDefault();
  event.stopPropagation();
  var target = event.target.closest("[data-oid]");
  if (!target) return;
  var dataOid = target.getAttribute("data-oid");
  if (!dataOid) return;
  var computedStyles = getComputedStyles(target);
  var boundingBox = getBoundingBox(target);
  var selector = getSelector(target);
  var selectionData = { dataOid: dataOid, selector: selector, computedStyles: computedStyles, boundingBox: boundingBox, tagName: target.tagName.toLowerCase(), textContent: (target.textContent || "").slice(0, 200) };
  var wasAdded = true;
  if (window.__piDesignWidget) wasAdded = window.__piDesignWidget.addSelection(selectionData);
  if (wasAdded && ws && isConnected) ws.send(JSON.stringify({ type: "design:select", dataOid: selectionData.dataOid, selector: selectionData.selector, computedStyles: selectionData.computedStyles, boundingBox: selectionData.boundingBox, tagName: selectionData.tagName, textContent: selectionData.textContent }));
}

function getComputedStyles(element) {
  var styles = window.getComputedStyle(element);
  var relevant = ["background-color","color","font-size","font-family","padding","margin","border-radius","display","width","height","gap","flex-direction"];
  var result = {};
  for (var i = 0; i < relevant.length; i++) result[relevant[i]] = styles.getPropertyValue(relevant[i]);
  return result;
}

function getBoundingBox(element) {
  var rect = element.getBoundingClientRect();
  return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
}

function getSelector(element) {
  if (element.id) return "#" + element.id;
  var selector = element.tagName.toLowerCase();
  if (element.className && typeof element.className === "string") selector += "." + element.className.trim().split(/\\s+/).join(".");
  return selector;
}

// --- Highlighting (server-triggered, single-color) ---
function highlightElement(dataOid) {
  var el = document.querySelector('[data-oid="' + CSS.escape(dataOid) + '"]');
  if (el) {
    el.style.outline = "2px solid #3b82f6";
    el.style.outlineOffset = "2px";
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// --- Hover Tooltip ---
var hoverTooltip = null;
var isAltDown = false;

document.addEventListener("keydown", function(e) {
  if (e.key === "Alt") isAltDown = true;
});
document.addEventListener("keyup", function(e) {
  if (e.key === "Alt") {
    isAltDown = false;
    hideHoverTooltip();
  }
});
window.addEventListener("blur", function() {
  isAltDown = false;
  hideHoverTooltip();
});

function showHoverTooltip(dataOid, x, y) {
  if (!hoverTooltip) {
    hoverTooltip = document.createElement("div");
    hoverTooltip.id = "pi-design-hover-tooltip";
    hoverTooltip.style.cssText = "position:fixed;z-index:999998;pointer-events:none;font-family:system-ui,-apple-system,sans-serif;font-size:12px;background:#1e1e2e;color:#cdd6f4;border:1px solid #45475a;border-radius:6px;padding:4px 8px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);";
    document.body.appendChild(hoverTooltip);
  }
  var parsed = parseDataOid(dataOid);
  var escapeHtml = function(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); };
  var tag = "";
  var location = dataOid;
  if (parsed) {
    location = parsed.filePath + ":" + parsed.line;
  }
  var el = document.querySelector('[data-oid="' + CSS.escape(dataOid) + '"]');
  if (el) tag = el.tagName.toLowerCase();
  hoverTooltip.innerHTML = '<span style="color:#89b4fa;font-family:monospace">' + escapeHtml(tag ? "<" + tag + ">" : "") + '</span> <span style="color:#a6adc8">' + escapeHtml(location) + '</span>';
  hoverTooltip.style.left = (x + 12) + "px";
  hoverTooltip.style.top = (y + 12) + "px";
  hoverTooltip.style.display = "block";
}

function hideHoverTooltip() {
  if (hoverTooltip) {
    hoverTooltip.style.display = "none";
  }
}

document.addEventListener("mouseover", function(e) {
  if (!isAltDown || !window.__piDesignWidget) return;
  var target = e.target.closest("[data-oid]");
  if (!target) { hideHoverTooltip(); return; }
  var dataOid = target.getAttribute("data-oid");
  if (dataOid) showHoverTooltip(dataOid, e.clientX, e.clientY);
});

document.addEventListener("mousemove", function(e) {
  if (!isAltDown || !hoverTooltip || hoverTooltip.style.display === "none") return;
  if (!e.target.closest("[data-oid]")) { hideHoverTooltip(); return; }
  hoverTooltip.style.left = (e.clientX + 12) + "px";
  hoverTooltip.style.top = (e.clientY + 12) + "px";
});

document.addEventListener("mouseout", function(e) {
  if (!e.target.closest("[data-oid]")) return;
  if (!e.relatedTarget || !e.relatedTarget.closest("[data-oid]")) hideHoverTooltip();
});

// --- Init ---
document.addEventListener("click", handleAltClick, true);
window.addEventListener("beforeunload", function() {
  if (ws && isConnected) ws.send(JSON.stringify({ type: "design:disconnect" }));
  disconnect();
});
connect();
`;
}
