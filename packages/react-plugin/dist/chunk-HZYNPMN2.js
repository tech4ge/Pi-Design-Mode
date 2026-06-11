import {
  injectDataOid
} from "./chunk-4ZKYYSAG.js";

// src/vite-plugin.ts
var VIRTUAL_CLIENT_ID = "virtual:pi-design-client";
var VIRTUAL_CLIENT_RESOLVED = "\0" + VIRTUAL_CLIENT_ID;
function piDesignVitePlugin(options) {
  return {
    name: "pi-design-react-plugin",
    enforce: "pre",
    apply: "serve",
    // Dev mode only
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
    transform(code, id) {
      if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) return null;
      if (id.includes("node_modules")) return null;
      const result = injectDataOid(code, id, options.projectRoot);
      return {
        code: result,
        map: null
        // TODO: generate source map
      };
    },
    transformIndexHtml(html) {
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: `import "${VIRTUAL_CLIENT_ID}";`,
          injectTo: "head"
        }
      ];
    }
  };
}
function generateClientScript(wsPort) {
  return `
// Pi Design Mode \u2014 Client Script (auto-generated)
const WS_PORT = ${wsPort};
const HIGHLIGHT_STYLE_ID = "pi-design-highlight-style";
const HIGHLIGHT_CLASS = "pi-design-selected";
const WIDGET_ID = "pi-design-widget";

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
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #f38ba8; display: inline-block; }
    .dot.connected { background: #a6e3a1; }
    .selections { max-height: 120px; overflow-y: auto; margin-bottom: 8px; }
    .selection-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: #313244; border-radius: 6px; margin-bottom: 4px; font-size: 12px; }
    .selection-item .tag { color: #89b4fa; font-family: monospace; }
    .selection-item .file { color: #a6adc8; flex: 1; margin-left: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .selection-item .remove { background: none; border: none; color: #f38ba8; cursor: pointer; padding: 0 4px; font-size: 14px; }
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
    <div class="header"><span class="dot"></span> Pi Design Mode</div>
    <div class="selections"></div>
    <div class="input-row">
      <input type="text" placeholder="Describe the change..." />
      <button class="submit-btn">Submit</button>
    </div>
    <div class="processing" style="display:none">\u23F3 Processing...</div>
    <div class="hint">Alt+Click to select \xB7 Esc to exit</div>
  \`;
  shadow.appendChild(style);
  shadow.appendChild(widget);

  const dot = shadow.querySelector(".dot");
  const selectionsContainer = shadow.querySelector(".selections");
  const input = shadow.querySelector("input");
  const submitBtn = shadow.querySelector(".submit-btn");
  const processingEl = shadow.querySelector(".processing");

  let selections = [];
  let isProcessing = false;

  function render() {
    dot.className = "dot" + (sendMessage.isConnected() ? " connected" : "");
    submitBtn.disabled = selections.length === 0 || isProcessing;
    input.disabled = isProcessing;
    selectionsContainer.innerHTML = "";
    for (const sel of selections) {
      const item = document.createElement("div");
      item.className = "selection-item";
      const parsed = sendMessage.parseDataOid(sel.dataOid);
      const location = parsed ? parsed.filePath + ":" + parsed.line : sel.dataOid;
      const escapeHtml = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
      item.innerHTML = '<span class="tag">&lt;' + escapeHtml(sel.tagName) + '&gt;</span><span class="file">' + escapeHtml(location) + '</span><button class="remove" data-oid="' + escapeHtml(sel.dataOid) + '"">\xD7</button>';
      item.querySelector(".remove").addEventListener("click", function() { removeSelection(sel.dataOid); });
      selectionsContainer.appendChild(item);
    }
    if (selections.length === 0) {
      selectionsContainer.innerHTML = '<div style="color:#6c7086;font-size:12px;padding:4px 0;">No element selected</div>';
    }
  }

  function removeSelection(dataOid) {
    selections = selections.filter(function(s) { return s.dataOid !== dataOid; });
    sendMessage.send({ type: "design:deselect", dataOid: dataOid });
    render();
  }

  submitBtn.addEventListener("click", function() {
    if (selections.length === 0 || isProcessing) return;
    const instruction = input.value.trim();
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

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && !e.altKey && document.activeElement !== input) {
      if (sendMessage.isConnected()) {
        sendMessage.send({ type: "design:disconnect" });
      }
      destroyWidget();
    }
  });

  window.__piDesignWidget = {
    addSelection: function(data) {
      selections = selections.filter(function(s) { return s.dataOid !== data.dataOid; });
      selections.push(data);
      render();
    },
    removeSelection: removeSelection,
    setProcessing: function(value) {
      isProcessing = value;
      processingEl.style.display = value ? "block" : "none";
      if (!value) { selections = []; }
      render();
    },
    isConnected: function() { return sendMessage.isConnected(); },
    destroy: destroyWidget,
  };
  render();
}

function destroyWidget() {
  const host = document.getElementById(WIDGET_ID);
  if (host) host.remove();
  delete window.__piDesignWidget;
}

// --- Connection ---
let ws = null;
let isConnected = false;

function connect() {
  const url = "ws://localhost:" + WS_PORT;
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
      break;
  }
}

function disconnect() {
  if (ws) { ws.onclose = null; ws.close(); ws = null; isConnected = false; }
  destroyWidget();
  removeHighlightStyle();
}

// --- Element Selection ---
function handleAltClick(event) {
  if (!event.altKey) return;
  event.preventDefault();
  event.stopPropagation();
  const target = event.target.closest("[data-oid]");
  if (!target) return;
  const dataOid = target.getAttribute("data-oid");
  if (!dataOid) return;
  const computedStyles = getComputedStyles(target);
  const boundingBox = getBoundingBox(target);
  const selector = getSelector(target);
  highlightElement(dataOid);
  const selectionData = { dataOid: dataOid, selector: selector, computedStyles: computedStyles, boundingBox: boundingBox, tagName: target.tagName.toLowerCase(), textContent: (target.textContent || "").slice(0, 200) };
  if (ws && isConnected) ws.send(JSON.stringify({ type: "design:select", ...selectionData }));
  if (window.__piDesignWidget) window.__piDesignWidget.addSelection(selectionData);
}

function getComputedStyles(element) {
  const styles = window.getComputedStyle(element);
  const relevant = ["background-color","color","font-size","font-family","padding","margin","border-radius","display","width","height","gap","flex-direction"];
  const result = {};
  for (const prop of relevant) result[prop] = styles.getPropertyValue(prop);
  return result;
}

function getBoundingBox(element) {
  const rect = element.getBoundingClientRect();
  return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
}

function getSelector(element) {
  if (element.id) return "#" + element.id;
  let selector = element.tagName.toLowerCase();
  if (element.className && typeof element.className === "string") selector += "." + element.className.trim().split(/\\s+/).join(".");
  return selector;
}

// --- Highlighting ---
function highlightElement(dataOid) {
  injectHighlightStyle();
  document.querySelectorAll("." + HIGHLIGHT_CLASS).forEach(function(el) { el.classList.remove(HIGHLIGHT_CLASS); });
  const target = document.querySelector('[data-oid="' + CSS.escape(dataOid) + '"]');
  if (target) target.classList.add(HIGHLIGHT_CLASS);
}

function injectHighlightStyle() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = "." + HIGHLIGHT_CLASS + " { outline: 2px solid #3b82f6 !important; outline-offset: 2px !important; }";
  document.head.appendChild(style);
}

function removeHighlightStyle() {
  var el = document.getElementById(HIGHLIGHT_STYLE_ID);
  if (el) el.remove();
  document.querySelectorAll("." + HIGHLIGHT_CLASS).forEach(function(el) { el.classList.remove(HIGHLIGHT_CLASS); });
}

// --- Init ---
document.addEventListener("click", handleAltClick, true);
window.addEventListener("beforeunload", function() {
  if (ws && isConnected) ws.send(JSON.stringify({ type: "design:disconnect" }));
  disconnect();
});
connect();
`;
}

export {
  piDesignVitePlugin
};
//# sourceMappingURL=chunk-HZYNPMN2.js.map