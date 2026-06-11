// src/data-oid.ts
import crypto from "crypto";
function formatDataOid(parts) {
  return `${parts.type}:${parts.projectHash}:r:${parts.filePath}:${parts.line}:${parts.column}`;
}
function parseDataOid(dataOid) {
  const match = dataOid.match(/^([cef]):([0-9a-f]+):r:(.+):(\d+):(\d+)$/);
  if (!match) return null;
  return {
    type: match[1],
    projectHash: match[2],
    filePath: match[3],
    line: parseInt(match[4], 10),
    column: parseInt(match[5], 10)
  };
}
function hashProjectRoot(projectRoot) {
  return crypto.createHash("sha256").update(projectRoot).digest("hex").slice(0, 8);
}

export {
  formatDataOid,
  parseDataOid,
  hashProjectRoot
};
//# sourceMappingURL=chunk-P5LJJ4GM.js.map