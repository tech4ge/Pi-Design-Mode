/**
 * Highlight functions for the Pi Design Mode browser client.
 *
 * Pure DOM manipulation for selection highlights.
 */

export function applyHighlight(dataOid: string, color: string, findByOid: (oid: string) => Element | null) {
  const el = findByOid(dataOid);
  if (el) {
    (el as HTMLElement).style.outline = `2px solid ${color}`;
    (el as HTMLElement).style.outlineOffset = "2px";
    el.setAttribute("data-pi-highlighted", "true");
  }
}

export function clearHighlight(dataOid: string, findByOid: (oid: string) => Element | null) {
  const el = findByOid(dataOid);
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
  applyHighlight: (dataOid: string, color: string, findByOid: (oid: string) => Element | null) => void
) {
  const highlighted = document.querySelectorAll("[data-pi-highlighted]");
  for (const el of highlighted) {
    (el as HTMLElement).style.outline = "";
    (el as HTMLElement).style.outlineOffset = "";
    el.removeAttribute("data-pi-highlighted");
  }
  for (let i = 0; i < selections.length; i++) {
    applyHighlight(selections[i].dataOid, colors[i % colors.length], findByOid);
  }
}
