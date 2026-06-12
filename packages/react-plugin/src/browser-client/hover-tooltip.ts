/**
 * Hover tooltip module for the Pi Design Mode browser client.
 *
 * Manages the Alt+Hover tooltip that shows element info.
 * Extracted from browser-client.ts for testability.
 */

interface HoverTooltipDeps {
  document: {
    body: { appendChild: (el: HTMLElement) => void };
    createElement: (tag: string) => HTMLElement;
  };
  escapeHtml: (s: string) => string;
}

export function createHoverTooltip(deps: HoverTooltipDeps) {
  const { document: doc, escapeHtml } = deps;
  let hoverTooltipEl: HTMLElement | null = null;

  function show(label: string, location: string, x: number, y: number) {
    if (!hoverTooltipEl) {
      hoverTooltipEl = doc.createElement("div");
      hoverTooltipEl.id = "pi-design-hover-tooltip";
      hoverTooltipEl.style.cssText = "position:fixed;z-index:999998;pointer-events:none;font-family:system-ui,-apple-system,sans-serif;font-size:12px;background:#1e1e2e;color:#cdd6f4;border:1px solid #45475a;border-radius:6px;padding:4px 8px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);";
      doc.body.appendChild(hoverTooltipEl);
    }
    hoverTooltipEl.innerHTML = `<span style="color:#89b4fa;font-family:monospace">${escapeHtml(label)}</span> <span style="color:#a6adc8">${escapeHtml(location)}</span>`;
    hoverTooltipEl.style.left = (x + 12) + "px";
    hoverTooltipEl.style.top = (y + 12) + "px";
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
