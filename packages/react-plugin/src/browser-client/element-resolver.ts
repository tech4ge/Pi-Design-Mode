/**
 * Element resolver module for the Pi Design Mode browser client.
 *
 * Pure functions for resolving specific DOM element instances.
 * All DOM operations are injected as parameters — no direct `document` access.
 */

/**
 * Find an element's position among siblings sharing the same data-oid.
 */
export function getInstanceIndex(
  element: Element,
  dataOid: string,
  querySelectorAll: (selector: string) => Element[],
): number {
  const all = querySelectorAll(`[data-oid="${dataOid}"],[data-source="${dataOid}"]`);
  for (let i = 0; i < all.length; i++) {
    if (all[i] === element) return i;
  }
  return 0;
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
): Element | null {
  // 1. Try WeakRef
  const el = selection.elementRef.deref();
  if (el && (el as any).isConnected === true) {
    return el;
  }

  // 2. Try querySelectorAll + instanceIndex
  const all = querySelectorAll(`[data-oid="${selection.dataOid}"],[data-source="${selection.dataOid}"]`);
  if (selection.instanceIndex < all.length) {
    return all[selection.instanceIndex];
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
