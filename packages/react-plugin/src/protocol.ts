/**
 * WS protocol types — shared between extension server and browser client.
 *
 * Browser-safe — no Node.js imports, no runtime code.
 * These TypeScript types are erased at build time.
 * Both server.ts and browser-client.ts import from here
 * so protocol changes cause compile errors, not silent runtime drift.
 */

// --- Client → Server messages ---

export type ClientMessage =
  | { type: "design:connect"; url: string; title: string }
  | { type: "design:select"; dataOid: string; instanceIndex: number; structuralSelector: string; selector: string; computedStyles: Record<string, string>; boundingBox: { x: number; y: number; width: number; height: number }; tagName: string; textContent: string }
  | { type: "design:submit"; selections: Array<{ dataOid: string; instanceIndex: number; structuralSelector: string }>; instruction: string; structuralContext?: { siblings: string[][]; sameComponent: string[][] } }
  | { type: "design:deselect"; dataOid: string; instanceIndex?: number }
  | { type: "design:disconnect" };

// --- Server → Client messages ---

export type ServerMessage =
  | { type: "design:mode:on"; wsPort: number }
  | { type: "design:mode:off" }
  | { type: "design:highlight"; dataOid: string }
  | { type: "design:processing" }
  | { type: "design:done" }
  | { type: "design:error"; message: string };
