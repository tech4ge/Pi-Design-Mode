/**
 * Element resolver module for the Pi Design Mode browser client.
 *
 * Pure functions for resolving specific DOM element instances.
 * All DOM operations are injected as parameters — no direct `document` access.
 */

/**
 * Minimal CSS value escaper — handles characters that appear in data-oid values.
 * Falls back to CSS.escape in browser contexts where available.
 */
function defaultCssEscape(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  // Minimal: escape quotes and backslashes for attribute selector values
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Find an element's position among siblings sharing the same data-oid.
 * Returns -1 if the element is not found in the query result
 * (e.g. DOM changed between click and resolution).
 */
export function getInstanceIndex(
  element: Element,
  dataOid: string,
  querySelectorAll: (selector: string) => Element[],
  cssEscape: (value: string) => string = defaultCssEscape,
): number {
  const escaped = cssEscape(dataOid);
  const all = querySelectorAll(`[data-oid="${escaped}"],[data-source="${escaped}"]`);
  for (let i = 0; i < all.length; i++) {
    if (all[i] === element) return i;
  }
  return -1;
}

export interface ResolvedSelection {
  dataOid: string;
  instanceIndex: number;
  elementRef: WeakRef<Element>;
  structuralSelector: string;
}

/**
 * Resolve a selected element through a priority chain:
 * 1. WeakRef.deref() — fast, works until React replaces the node
 * 2. querySelectorAll[index] — survives WeakRef death if list is stable
 * 3. Structural selector query — survives list re-order if path is still valid
 * 4. null — element no longer exists in DOM
 */
export function resolveElement(
  selection: ResolvedSelection,
  querySelectorAll: (selector: string) => Element[],
  querySelector: (selector: string) => Element | null,
  cssEscape: (value: string) => string = defaultCssEscape,
): Element | null {
  // 1. Try WeakRef
  const el = selection.elementRef.deref();
  if (el?.isConnected === true) {
    return el;
  }

  // 2. Try querySelectorAll + instanceIndex (skip if index is -1)
  if (selection.instanceIndex >= 0) {
    const escaped = cssEscape(selection.dataOid);
    const all = querySelectorAll(`[data-oid="${escaped}"],[data-source="${escaped}"]`);
    if (selection.instanceIndex < all.length) {
      return all[selection.instanceIndex];
    }
  }

  // 3. Try structural selector
  if (selection.structuralSelector) {
    const found = querySelector(selection.structuralSelector);
    if (found) return found;
  }

  return null;
}

/**
 * Compute a unique CSS selector for an element by walking the DOM tree.
 * Playwright / Chrome DevTools pattern — tag + :nth-child(n) segments.
 * Stops at (but does not include) `parentLimit`.
 */
export function computeStructuralSelector(
  element: Element,
  parentLimit: Element,
): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== parentLimit) {
    const parent = current.parentElement;
    if (!parent) break;

    const tag = current.tagName.toLowerCase();
    const siblings = Array.from(parent.children);
    const sameTagSiblings = siblings.filter(
      (s) => s.tagName === current!.tagName,
    );

    if (sameTagSiblings.length === 1) {
      parts.unshift(tag);
    } else {
      const index = siblings.indexOf(current) + 1; // :nth-child is 1-based
      parts.unshift(`${tag}:nth-child(${index})`);
    }

    current = parent;
    if (current === parentLimit) break;
  }

  return parts.join(" > ");
}
