// src/data-oid/shared.ts
function formatDataOid(parts) {
  return `${parts.type}:${parts.projectHash}:r:${parts.filePath}:${parts.line}:${parts.column}`;
}
function parseDataOid(dataOid) {
  const babelMatch = dataOid.match(/^([cef]):([0-9a-f]+):r:(.+):(\d+):(\d+)$/);
  if (babelMatch) {
    return {
      type: babelMatch[1],
      projectHash: babelMatch[2],
      filePath: babelMatch[3],
      line: parseInt(babelMatch[4], 10),
      column: parseInt(babelMatch[5], 10)
    };
  }
  const swcFull = dataOid.match(/^(.+):(\d+):(\d+)$/);
  if (swcFull) {
    return {
      type: "c",
      projectHash: "",
      filePath: swcFull[1],
      line: parseInt(swcFull[2], 10),
      column: parseInt(swcFull[3], 10)
    };
  }
  const swcLine = dataOid.match(/^(.+):(\d+)$/);
  if (swcLine) {
    return {
      type: "c",
      projectHash: "",
      filePath: swcLine[1],
      line: parseInt(swcLine[2], 10),
      column: 0
    };
  }
  return null;
}

export {
  formatDataOid,
  parseDataOid
};
//# sourceMappingURL=chunk-2TNFN65E.js.map