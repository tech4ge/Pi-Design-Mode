import crypto from "node:crypto";

export { parseDataOid, formatDataOid, type DataOidComponents } from "./shared.js";

/**
 * Hash the project root path into a short stable identifier.
 * Uses Node.js crypto — NOT browser-safe. Only import this from Node-side code.
 */
export function hashProjectRoot(projectRoot: string): string {
  return crypto.createHash("sha256").update(projectRoot).digest("hex").slice(0, 8);
}
