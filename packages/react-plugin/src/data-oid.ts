import crypto from "node:crypto";

/**
 * data-oid format (Babel/Vite): c:H:r:file:line:column
 *   c — component type marker (future: 'e' for element, 'f' for fragment)
 *   H — short hash of project root
 *   r — reserved separator
 *   file — relative file path from project root
 *   line — line number in source file
 *   column — column number in source file
 *
 * data-oid format (SWC/Next.js): file:line:column
 *   Produced by swc-plugin-source-tracker with attr: "data-oid".
 *   Simpler format — no project hash or type marker needed.
 */

export interface DataOidComponents {
  type: string;
  projectHash: string;
  filePath: string;
  line: number;
  column: number;
}

export function formatDataOid(parts: DataOidComponents): string {
  return `${parts.type}:${parts.projectHash}:r:${parts.filePath}:${parts.line}:${parts.column}`;
}

export function parseDataOid(dataOid: string): DataOidComponents | null {
  // Babel/Vite format: c:H:r:file:line:column
  const babelMatch = dataOid.match(/^([cef]):([0-9a-f]+):r:(.+):(\d+):(\d+)$/);
  if (babelMatch) {
    return {
      type: babelMatch[1],
      projectHash: babelMatch[2],
      filePath: babelMatch[3],
      line: parseInt(babelMatch[4], 10),
      column: parseInt(babelMatch[5], 10),
    };
  }
  // SWC format (file:line:column) — e.g. swc-plugin-source-tracker
  const swcFull = dataOid.match(/^(.+):(\d+):(\d+)$/);
  if (swcFull) {
    return {
      type: "c",
      projectHash: "",
      filePath: swcFull[1],
      line: parseInt(swcFull[2], 10),
      column: parseInt(swcFull[3], 10),
    };
  }
  // SWC format (file:line) — e.g. swc-plugin-react-source-string
  const swcLine = dataOid.match(/^(.+):(\d+)$/);
  if (swcLine) {
    return {
      type: "c",
      projectHash: "",
      filePath: swcLine[1],
      line: parseInt(swcLine[2], 10),
      column: 0,
    };
  }
  return null;
}

export function hashProjectRoot(projectRoot: string): string {
  return crypto.createHash("sha256").update(projectRoot).digest("hex").slice(0, 8);
}
