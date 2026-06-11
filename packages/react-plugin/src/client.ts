/**
 * Pi Design Mode — Client Script
 *
 * Runs in the browser, connects to Pi's WebSocket server,
 * handles Alt+Click element selection, and renders the design mode overlay.
 *
 * Injected as a virtual module by @pi-design/react-plugin.
 */

import { parseDataOid } from "../data-oid.js";
import { createWidget, destroyWidget } from "./widget.js";

const WS_PORT = 9481;
const HIGHLIGHT_STYLE_ID = "pi-design-highlight-style";
const HIGHLIGHT_CLASS = "pi-design-selected";

let ws = null;
let isConnected = false;

// --- Connection ---

function connect() {
  const url = `ws://localhost:${WS_PORT}`;
  ws = new WebSocket(url);

  ws.onopen = () => {
    isConnected = true;
    ws.send(JSON.stringify({
      type: "design:connect",
      url: window.location.href,
      title: document.title,
    }));

    // Create widget once connected
    createWidget({
      send: (message) => {
        if (ws && isConnected) {
          ws.send(JSON.stringify(message));
        }
      },
      isConnected: () => isConnected,
      parseDataOid,
    });
  };

  ws.onclose = () => {
    isConnected = false;
    destroyWidget();
    // Auto-reconnect with backoff
    setTimeout(connect, 2000);
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    } catch {
      // Ignore malformed messages
    }
  };
}

function handleServerMessage(message) {
  switch (message.type) {
    case "design:mode:off":
      disconnect();
      break;
    case "design:highlight":
      highlightElement(message.dataOid);
      break;
    case "design:processing":
      if (window.__piDesignWidget) {
        window.__piDesignWidget.setProcessing(true);
      }
      break;
    case "design:done":
      if (window.__piDesignWidget) {
        window.__piDesignWidget.setProcessing(false);
      }
      break;
  }
}

function disconnect() {
  if (ws) {
    ws.onclose = null; // Prevent reconnect
    ws.close();
    ws = null;
    isConnected = false;
  }
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

  // Extract element info
  const computedStyles = getComputedStyles(target);
  const boundingBox = getBoundingBox(target);
  const selector = getSelector(target);

  // Highlight the element
  highlightElement(dataOid);

  const selectionData = {
    dataOid,
    selector,
    computedStyles,
    boundingBox,
    tagName: target.tagName.toLowerCase(),
    textContent: target.textContent?.slice(0, 200) ?? "",
  };

  // Send to Pi
  ws.send(JSON.stringify({
    type: "design:select",
    ...selectionData,
  }));

  // Update widget
  if (window.__piDesignWidget) {
    window.__piDesignWidget.addSelection(selectionData);
  }
}

function getComputedStyles(element) {
  const styles = window.getComputedStyle(element);
  const relevant = [
    "background-color", "color", "font-size", "font-family",
    "padding", "margin", "border-radius", "display",
    "width", "height", "gap", "flex-direction",
  ];
  const result = {};
  for (const prop of relevant) {
    result[prop] = styles.getPropertyValue(prop);
  }
  return result;
}

function getBoundingBox(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function getSelector(element) {
  if (element.id) return `#${element.id}`;
  let selector = element.tagName.toLowerCase();
  if (element.className && typeof element.className === "string") {
    selector += "." + element.className.trim().split(/\s+/).join(".");
  }
  return selector;
}

// --- Highlighting ---

function highlightElement(dataOid) {
  injectHighlightStyle();
  // Remove previous highlights
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
    el.classList.remove(HIGHLIGHT_CLASS);
  });
  // Highlight the target
  const target = document.querySelector(`[data-oid="${CSS.escape(dataOid)}"]`);
  if (target) {
    target.classList.add(HIGHLIGHT_CLASS);
  }
}

function injectHighlightStyle() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `.${HIGHLIGHT_CLASS} { outline: 2px solid #3b82f6 !important; outline-offset: 2px !important; }`;
  document.head.appendChild(style);
}

function removeHighlightStyle() {
  document.getElementById(HIGHLIGHT_STYLE_ID)?.remove();
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
    el.classList.remove(HIGHLIGHT_CLASS);
  });
}

// --- Init ---

document.addEventListener("click", handleAltClick, true);
window.addEventListener("beforeunload", () => {
  if (ws && isConnected) {
    ws.send(JSON.stringify({ type: "design:disconnect" }));
  }
  disconnect();
});

connect();
