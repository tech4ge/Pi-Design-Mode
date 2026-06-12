/**
 * Widget DOM creation for the Pi Design Mode browser client.
 *
 * Creates the shadow DOM widget and returns element references.
 * Event wiring stays in the orchestrator.
 */

import { WIDGET_CSS, WIDGET_HTML } from "./widget-template.js";

export interface WidgetElements {
  dot: HTMLElement;
  submitBtn: HTMLButtonElement;
  input: HTMLTextAreaElement;
  processingEl: HTMLElement;
  errorBanner: HTMLElement;
  errorMsg: HTMLElement;
  historyDropdown: HTMLElement;
  cancelBtn: HTMLButtonElement;
  quickActions: HTMLElement;
  qaMultiBtns: NodeListOf<Element>;
  hint: HTMLElement;
  widget: HTMLElement;
  shadow: ShadowRoot;
}

export const WIDGET_ID = "pi-design-widget";

export function createWidgetDOM(document: Document): { widgetHost: HTMLElement; elements: WidgetElements } | null {
  if (document.getElementById(WIDGET_ID)) return null;

  const widgetHost = document.createElement("div");
  widgetHost.id = WIDGET_ID;
  widgetHost.style.cssText = "position:fixed;bottom:16px;right:16px;z-index:999999;font-family:system-ui,sans-serif;";
  document.body.appendChild(widgetHost);
  const shadow = widgetHost.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = WIDGET_CSS;
  shadow.appendChild(style);

  const widget = document.createElement("div");
  widget.className = "widget";
  widget.innerHTML = WIDGET_HTML;
  shadow.appendChild(widget);

  const dot = shadow.querySelector(".dot")!;
  const submitBtn = shadow.querySelector(".submit-btn")! as HTMLButtonElement;
  const input = shadow.querySelector("textarea")! as HTMLTextAreaElement;
  const processingEl = shadow.querySelector(".processing")!;
  const errorBanner = shadow.querySelector(".error-banner")!;
  const errorMsg = shadow.querySelector(".error-msg")!;
  const historyDropdown = shadow.querySelector(".history-panel")!;
  const cancelBtn = shadow.querySelector(".cancel")!;
  const quickActions = shadow.querySelector(".quick-actions")!;
  const qaMultiBtns = shadow.querySelectorAll(".qa-btn[data-multi]");
  const hint = shadow.querySelector(".hint")!;

  return {
    widgetHost,
    elements: {
      dot: dot as HTMLElement,
      submitBtn,
      input,
      processingEl: processingEl as HTMLElement,
      errorBanner: errorBanner as HTMLElement,
      errorMsg: errorMsg as HTMLElement,
      historyDropdown: historyDropdown as HTMLElement,
      cancelBtn: cancelBtn as HTMLButtonElement,
      quickActions: quickActions as HTMLElement,
      qaMultiBtns,
      hint: hint as HTMLElement,
      widget: widget as HTMLElement,
      shadow,
    },
  };
}
