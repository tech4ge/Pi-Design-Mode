import crypto from "node:crypto";

/**
 * data-oid format: c:H:r:file:line:column
 *   c — component type marker (future: 'e' for element, 'f' for fragment)
 *   H — short hash of project root
 *   r — reserved separator
 *   file — relative file path from project root
 *   line — line number in source file
 *   column — column number in source file
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
  const match = dataOid.match(/^([cef]):([0-9a-f]+):r:(.+):(\d+):(\d+)$/);
  if (!match) return null;
  return {
    type: match[1],
    projectHash: match[2],
    filePath: match[3],
    line: parseInt(match[4], 10),
    column: parseInt(match[5], 10),
  };
}

export function hashProjectRoot(projectRoot: string): string {
  return crypto.createHash("sha256").update(projectRoot).digest("hex").slice(0, 8);
}
