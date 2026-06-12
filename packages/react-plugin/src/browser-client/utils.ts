/**
 * Utility functions for the Pi Design Mode browser client.
 *
 * Pure functions with no side effects.
 * Extracted from browser-client.ts for testability.
 */

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function getSelector(element: Element): string {
  if (element.id) return "#" + element.id;
  return element.tagName.toLowerCase();
}

export function computeStructuralContext(
  oids: string[],
  findByOid: (oid: string) => Element | null
): { siblings: string[][]; sameComponent: string[][] } {
  if (oids.length <= 1) return { siblings: [] as string[][], sameComponent: [] as string[][] };
  const parentMap = new Map<Element, string[]>();
  for (const oid of oids) {
    const el = findByOid(oid);
    if (el && el.parentElement) {
      if (!parentMap.has(el.parentElement)) parentMap.set(el.parentElement, []);
      parentMap.get(el.parentElement)!.push(oid);
    }
  }
  const siblings: string[][] = [];
  for (const [, childOids] of parentMap) {
    if (childOids.length > 1) siblings.push(childOids);
  }
  const sameComponent: string[][] = [];
  const componentMap = new Map<string, string[]>();
  for (const oid of oids) {
    const parsed = oid.match(/^c:([^:]+):/);
    if (parsed) {
      const comp = parsed[1];
      if (!componentMap.has(comp)) componentMap.set(comp, []);
      componentMap.get(comp)!.push(oid);
    }
  }
  for (const [, compOids] of componentMap) {
    if (compOids.length > 1) sameComponent.push(compOids);
  }
  return { siblings, sameComponent };
}

export function getComputedStyles(element: Element): Record<string, string> {
  const cs = window.getComputedStyle(element);
  return {
    display: cs.display,
    position: cs.position,
    color: cs.color,
    backgroundColor: cs.backgroundColor,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    margin: cs.margin,
    padding: cs.padding,
    width: cs.width,
    height: cs.height,
    borderRadius: cs.borderRadius,
    gap: cs.gap,
    justifyContent: cs.justifyContent,
    alignItems: cs.alignItems,
    flexDirection: cs.flexDirection,
  };
}

export function getBoundingBox(element: Element) {
  const rect = element.getBoundingClientRect();
  return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
}
