import {
  hashProjectRoot
} from "./chunk-UFS4G3GI.js";
import {
  formatDataOid
} from "./chunk-2TNFN65E.js";

// src/transform.ts
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
var traverse = _traverse.default || _traverse;
var generate = _generate.default || _generate;
function injectDataOid(source, filePath, projectRoot) {
  const projectHash = hashProjectRoot(projectRoot);
  const relativePath = filePath.startsWith(projectRoot) ? filePath.slice(projectRoot.length).replace(/^\//, "") : filePath;
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });
  traverse(ast, {
    JSXOpeningElement(path) {
      const loc = path.node.loc;
      if (!loc) return;
      const hasDataOid = path.node.attributes.some(
        (attr) => attr.type === "JSXAttribute" && attr.name.type === "JSXIdentifier" && attr.name.name === "data-oid"
      );
      if (hasDataOid) return;
      const dataOid = formatDataOid({
        type: "c",
        projectHash,
        filePath: relativePath,
        line: loc.start.line,
        column: loc.start.column + 1
      });
      path.node.attributes.push({
        type: "JSXAttribute",
        name: { type: "JSXIdentifier", name: "data-oid" },
        value: { type: "StringLiteral", value: dataOid }
      });
    }
  });
  return generate(ast, { retainLines: true }).code;
}

export {
  injectDataOid
};
//# sourceMappingURL=chunk-6ZFKMQWJ.js.map