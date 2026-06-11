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
    .widget { background: #1e1e2e; border: 1px solid #45475a; border-radius: 12px; padding: 12px; min-width: 280px; max-width: 360px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); color: #cdd6f4; font-size: 13px; }
    .header { display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 8px; font-size: 14px; }
    .header .title { flex: 1; display: flex; align-items: center; gap: 6px; }
    .close-btn { background: none; border: none; color: #6c7086; cursor: pointer; padding: 2px 6px; font-size: 16px; border-radius: 4px; line-height: 1; }
    .close-btn:hover { color: #cdd6f4; background: #313244; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #f38ba8; display: inline-block; }
    .dot.connected { background: #a6e3a1; }
    .selections { max-height: 120px; overflow-y: auto; margin-bottom: 8px; }
    .color-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; margin-right: 3px; }
    .selection-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: #313244; border-radius: 6px; margin-bottom: 4px; font-size: 12px; cursor: pointer; transition: background 0.1s; }
    .selection-item:hover { background: #45475a; }
    .selection-item .tag { color: #89b4fa; font-family: monospace; }
    .selection-item .file { color: #a6adc8; flex: 1; margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .selection-item .remove { background: none; border: none; color: #f38ba8; cursor: pointer; padding: 0 4px; font-size: 14px; }
    .selection-item .remove:hover { color: #eba0ac; }
    .input-row { display: flex; gap: 6px; }
    .input-row input { flex: 1; background: #313244; border: 1px solid #45475a; border-radius: 6px; padding: 6px 8px; color: #cdd6f4; font-size: 13px; outline: none; }
    .input-row input:focus { border-color: #89b4fa; }
    .submit-btn { background: #89b4fa; color: #1e1e2e; border: none; border-radius: 6px; padding: 6px 12px; font-weight: 600; cursor: pointer; font-size: 13px; }
    .submit-btn:hover { background: #b4d0fb; }
    .submit-btn:disabled { background: #45475a; color: #6c7086; cursor: not-allowed; }
    .processing { color: #f9e2af; font-size: 12px; text-align: center; margin-top: 6px; }
    .hint { color: #6c7086; font-size: 11px; margin-top: 6px; }
  \`;
  const widget = document.createElement("div");
  widget.className = "widget";
  widget.innerHTML = \`
    <div class="header"><div class="title"><span class="dot"></span> Pi Design Mode</div><button class="close-btn" title="Clear selection">✕</button></div>
    <div class="selections"></div>
    <div class="input-row">
      <input type="text" placeholder="Describe the change..." />
      <button class="submit-btn">Submit</button>
    </div>
    <div class="processing" style="display:none">⏳ Processing...</div>
    <div class="hint">Alt+Click to select · Esc to clear</div>
  \`;
  shadow.appendChild(style);
  shadow.appendChild(widget);

  const dot = shadow.querySelector(".dot");
  const closeBtn = shadow.querySelector(".close-btn");
  const selectionsContainer = shadow.querySelector(".selections");
  const input = shadow.querySelector("input");
  const submitBtn = shadow.querySelector(".submit-btn");
  const processingEl = shadow.querySelector(".processing");

  let selections = [];
  let submittedOids = [];
  let isProcessing = false;

  function render() {
    dot.className = "dot" + (sendMessage.isConnected() ? " connected" : "");
    submitBtn.disabled = selections.length === 0 || isProcessing;
    input.disabled = isProcessing;
    selectionsContainer.innerHTML = "";
    for (var i = 0; i < selections.length; i++) {
      var sel = selections[i];
      var color = SELECTION_COLORS[i % SELECTION_COLORS.length];
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
    render();
  }

  function flashEditedElements() {
    if (submittedOids.length === 0) return;
    // Wait 500ms for HMR to re-render
    setTimeout(function() {
      for (var i = 0; i < submittedOids.length; i++) {
        var el = document.querySelector('[data-oid="' + CSS.escape(submittedOids[i]) + '"]');
        if (el) {
          el.style.outline = "2px solid #a6e3a1";
          el.style.outlineOffset = "2px";
          (function(element) {
            setTimeout(function() {
              element.style.outline = "";
              element.style.outlineOffset = "";
            }, 2000);
          })(el);
        }
      }
      submittedOids = [];
    }, 500);
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

  submitBtn.addEventListener("click", function() {
    if (selections.length === 0 || isProcessing) return;
    var instruction = input.value.trim();
    if (!instruction) return;
    sendMessage.send({
      type: "design:submit",
      selections: selections.map(function(s) { return s.dataOid; }),
      instruction: instruction,
    });
    input.value = "";
    isProcessing = true;
    processingEl.style.display = "block";
    render();
  });

  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter") submitBtn.click();
  });

  closeBtn.addEventListener("click", function() { clearAllSelections(); });

  document.addEventListener("keydown", function(e) {
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
      render();
      return true;
    },
    removeSelection: removeSelection,
    clearAllSelections: clearAllSelections,
    setProcessing: function(value) {
      isProcessing = value;
      processingEl.style.display = value ? "block" : "none";
      if (value) {
        // Stash submitted data-oids for post-edit flash
        submittedOids = selections.map(function(s) { return s.dataOid; });
      }
      if (!value) {
        for (var i = 0; i < selections.length; i++) { clearHighlight(selections[i].dataOid); }
        selections = [];
      }
      render();
    },
    isConnected: function() { return sendMessage.isConnected(); },
    flashEditedElements: flashEditedElements,
    destroy: destroyWidget,
  };
  render();
}

function destroyWidget() {
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
    createWidget({
      send: function(message) { if (ws && isConnected) ws.send(JSON.stringify(message)); },
      isConnected: function() { return isConnected; },
      parseDataOid: parseDataOid,
    });
  };
  ws.onclose = function() {
    isConnected = false;
    destroyWidget();
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
      break;
  }
}

function disconnect() {
  if (ws) { ws.onclose = null; ws.close(); ws = null; isConnected = false; }
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
