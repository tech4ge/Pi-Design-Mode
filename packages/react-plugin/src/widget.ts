/**
 * Pi Design Mode — Browser Widget
 *
 * Shadow DOM overlay for element selection, instructions, and submission.
 * Rendered in the bottom-right corner of the viewport.
 */

const WIDGET_ID = "pi-design-widget";

export function createWidget(sendMessage) {
  // Don't create duplicate
  if (document.getElementById(WIDGET_ID)) return;

  const host = document.createElement("div");
  host.id = WIDGET_ID;
  host.style.cssText = "position:fixed;bottom:16px;right:16px;z-index:999999;font-family:system-ui,sans-serif;";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .widget {
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 12px;
      padding: 12px;
      min-width: 280px;
      max-width: 360px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.3);
      color: #cdd6f4;
      font-size: 13px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #f38ba8;
      display: inline-block;
    }
    .dot.connected { background: #a6e3a1; }
    .selections {
      max-height: 120px;
      overflow-y: auto;
      margin-bottom: 8px;
    }
    .selection-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      background: #313244;
      border-radius: 6px;
      margin-bottom: 4px;
      font-size: 12px;
    }
    .selection-item .tag {
      color: #89b4fa;
      font-family: monospace;
    }
    .selection-item .file {
      color: #a6adc8;
      flex: 1;
      margin-left: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .selection-item .remove {
      background: none;
      border: none;
      color: #f38ba8;
      cursor: pointer;
      padding: 0 4px;
      font-size: 14px;
    }
    .input-row {
      display: flex;
      gap: 6px;
    }
    .input-row input {
      flex: 1;
      background: #313244;
      border: 1px solid #45475a;
      border-radius: 6px;
      padding: 6px 8px;
      color: #cdd6f4;
      font-size: 13px;
      outline: none;
    }
    .input-row input:focus {
      border-color: #89b4fa;
    }
    .submit-btn {
      background: #89b4fa;
      color: #1e1e2e;
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
    }
    .submit-btn:hover { background: #b4d0fb; }
    .submit-btn:disabled {
      background: #45475a;
      color: #6c7086;
      cursor: not-allowed;
    }
    .processing {
      color: #f9e2af;
      font-size: 12px;
      text-align: center;
      margin-top: 6px;
    }
    .hint {
      color: #6c7086;
      font-size: 11px;
      margin-top: 6px;
    }
  `;

  const widget = document.createElement("div");
  widget.className = "widget";
  widget.innerHTML = `
    <div class="header"><span class="dot"></span> Pi Design Mode</div>
    <div class="selections"></div>
    <div class="input-row">
      <input type="text" placeholder="Describe the change..." />
      <button class="submit-btn">Submit</button>
    </div>
    <div class="processing" style="display:none">⏳ Processing...</div>
    <div class="hint">Alt+Click to select · Esc to exit</div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(widget);

  const dot = shadow.querySelector(".dot");
  const selectionsContainer = shadow.querySelector(".selections");
  const input = shadow.querySelector("input");
  const submitBtn = shadow.querySelector(".submit-btn");
  const processingEl = shadow.querySelector(".processing");

  // State
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
      const location = parsed ? `${parsed.filePath}:${parsed.line}` : sel.dataOid;
      item.innerHTML = `<span class="tag">&lt;${sel.tagName}&gt;</span><span class="file">${location}</span><button class="remove" data-oid="${sel.dataOid}">×</button>`;
      item.querySelector(".remove").addEventListener("click", () => {
        removeSelection(sel.dataOid);
      });
      selectionsContainer.appendChild(item);
    }

    if (selections.length === 0) {
      selectionsContainer.innerHTML = '<div style="color:#6c7086;font-size:12px;padding:4px 0;">No element selected</div>';
    }
  }

  function removeSelection(dataOid) {
    selections = selections.filter((s) => s.dataOid !== dataOid);
    sendMessage.send({ type: "design:deselect", dataOid });
    render();
  }

  // Events
  submitBtn.addEventListener("click", () => {
    if (selections.length === 0 || isProcessing) return;
    const instruction = input.value.trim();
    if (!instruction) return;

    sendMessage.send({
      type: "design:submit",
      selections: selections.map((s) => s.dataOid),
      instruction,
    });

    input.value = "";
    isProcessing = true;
    processingEl.style.display = "block";
    render();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      submitBtn.click();
    }
  });

  // Escape to exit
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !e.altKey && document.activeElement !== input) {
      destroyWidget();
    }
  });

  // Public API
  window.__piDesignWidget = {
    addSelection(data) {
      // Replace if same oid, else add
      selections = selections.filter((s) => s.dataOid !== data.dataOid);
      selections.push(data);
      render();
    },
    removeSelection(dataOid) {
      removeSelection(dataOid);
    },
    setProcessing(value) {
      isProcessing = value;
      processingEl.style.display = value ? "block" : "none";
      if (!value) {
        // Clear selections after successful processing
        selections = [];
      }
      render();
    },
    isConnected: () => sendMessage.isConnected(),
    destroy: destroyWidget,
  };

  render();
}

export function destroyWidget() {
  const host = document.getElementById(WIDGET_ID);
  if (host) {
    host.remove();
  }
  delete window.__piDesignWidget;
}
