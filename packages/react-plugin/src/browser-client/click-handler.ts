/**
 * Click handler module for the Pi Design Mode browser client.
 *
 * Pure function to build selection data from a clicked element.
 * The event wiring (isAltDown, preventDefault, etc.) stays in the orchestrator.
 */

import { getInstanceIndex, computeStructuralSelector } from "./element-resolver.js";

interface ClickDeps {
  getSelector: (el: Element) => string;
  getComputedStyles: (el: Element) => Record<string, string>;
  getBoundingBox: (el: Element) => { x: number; y: number; width: number; height: number };
  querySelectorAll: (selector: string) => Element[];
  cssEscape?: (value: string) => string;
  bodyElement: Element | null;
}

export interface SelectionData {
  dataOid: string;
  instanceIndex: number;
  elementRef: WeakRef<Element>;
  structuralSelector: string;
  selector: string;
  computedStyles: Record<string, string>;
  boundingBox: { x: number; y: number; width: number; height: number };
  tagName: string;
  textContent: string;
}

export function buildSelectionData(target: Element, deps: ClickDeps): SelectionData {
  const dataOid = target.getAttribute("data-oid") || target.getAttribute("data-source") || "";
  const instanceIndex = getInstanceIndex(target, dataOid, deps.querySelectorAll, deps.cssEscape);
  const structuralSelector = deps.bodyElement
    ? computeStructuralSelector(target, deps.bodyElement)
    : "";
  return {
    dataOid,
    instanceIndex,
    elementRef: new WeakRef(target),
    structuralSelector,
    selector: deps.getSelector(target),
    computedStyles: deps.getComputedStyles(target),
    boundingBox: deps.getBoundingBox(target),
    tagName: target.tagName.toLowerCase(),
    textContent: (target.textContent || "").slice(0, 200),
  };
}
