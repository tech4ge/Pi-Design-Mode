// src/data-oid/index.ts
import crypto from "crypto";
function hashProjectRoot(projectRoot) {
  return crypto.createHash("sha256").update(projectRoot).digest("hex").slice(0, 8);
}

export {
  hashProjectRoot
};
//# sourceMappingURL=chunk-UFS4G3GI.js.map