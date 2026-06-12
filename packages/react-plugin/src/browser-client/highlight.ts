/**
 * Highlight functions for the Pi Design Mode browser client.
 *
 * Pure DOM manipulation for selection highlights.
 * Supports instance-aware resolution via an optional resolver function.
 */

import type { ResolvedSelection } from "./element-resolver.js";
import { resolveElement } from "./element-resolver.js";

export type ElementResolver = (selection: ResolvedSelection) => Element | null;

export function applyHighlight(
  dataOid: string,
  color: string,
  findByOid: (oid: string) => Element | null,
  resolveSelection?: ElementResolver,
  selection?: any,
): void {
  const el = resolveEl(dataOid, findByOid, resolveSelection, selection);
  if (el) {
    (el as HTMLElement).style.outline = `2px solid ${color}`;
    (el as HTMLElement).style.outlineOffset = "2px";
    el.setAttribute("data-pi-highlighted", "true");
  }
}

export function clearHighlight(
  dataOid: string,
  findByOid: (oid: string) => Element | null,
  resolveSelection?: ElementResolver,
  selection?: any,
): void {
  const el = resolveEl(dataOid, findByOid, resolveSelection, selection);
  if (el) {
    (el as HTMLElement).style.outline = "";
    (el as HTMLElement).style.outlineOffset = "";
    el.removeAttribute("data-pi-highlighted");
  }
}

export function reapplyAllHighlights(
  selections: any[],
  colors: string[],
  findByOid: (oid: string) => Element | null,
  applyHighlightFn: (dataOid: string, color: string, findByOid: (oid: string) => Element | null, resolveSelection?: ElementResolver, selection?: any) => void,
  resolveSelection?: ElementResolver,
): void {
  const highlighted = document.querySelectorAll("[data-pi-highlighted]");
  for (const el of highlighted) {
    (el as HTMLElement).style.outline = "";
    (el as HTMLElement).style.outlineOffset = "";
    el.removeAttribute("data-pi-highlighted");
  }
  for (let i = 0; i < selections.length; i++) {
    applyHighlightFn(selections[i].dataOid, colors[i % colors.length], findByOid, resolveSelection, selections[i]);
  }
}

/**
 * Resolve element for highlight/clear operations.
 * Uses instance-aware resolver when available, falls back to findByOid.
 */
function resolveEl(
  dataOid: string,
  findByOid: (oid: string) => Element | null,
  resolveSelection?: ElementResolver,
  selection?: any,
): Element | null {
  if (resolveSelection && selection) {
    return resolveSelection(selection);
  }
  return findByOid(dataOid);
}
