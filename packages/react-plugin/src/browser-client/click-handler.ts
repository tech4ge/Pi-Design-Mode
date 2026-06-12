/**
 * Click handler module for the Pi Design Mode browser client.
 *
 * Pure function to build selection data from a clicked element.
 * The event wiring (isAltDown, preventDefault, etc.) stays in the orchestrator.
 */

interface ClickDeps {
  getSelector: (el: Element) => string;
  getComputedStyles: (el: Element) => Record<string, string>;
  getBoundingBox: (el: Element) => { x: number; y: number; width: number; height: number };
}

export interface SelectionData {
  dataOid: string;
  selector: string;
  computedStyles: Record<string, string>;
  boundingBox: { x: number; y: number; width: number; height: number };
  tagName: string;
  textContent: string;
}

export function buildSelectionData(target: Element, deps: ClickDeps): SelectionData {
  const dataOid = target.getAttribute("data-oid") || target.getAttribute("data-source") || "";
  return {
    dataOid,
    selector: deps.getSelector(target),
    computedStyles: deps.getComputedStyles(target),
    boundingBox: deps.getBoundingBox(target),
    tagName: target.tagName.toLowerCase(),
    textContent: (target.textContent || "").slice(0, 200),
  };
}
