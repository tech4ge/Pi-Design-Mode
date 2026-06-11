import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";

// @babel CJS/ESM interop
const traverse = _traverse.default || _traverse;
const generate = _generate.default || _generate;
import { formatDataOid, hashProjectRoot } from "./data-oid.js";

/**
 * Inject data-oid attributes into JSX source code.
 */
export function injectDataOid(
  source: string,
  filePath: string,
  projectRoot: string,
): string {
  const projectHash = hashProjectRoot(projectRoot);
  const relativePath = filePath.startsWith(projectRoot)
    ? filePath.slice(projectRoot.length).replace(/^\//, "")
    : filePath;

  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  traverse(ast, {
    JSXOpeningElement(path) {
      const loc = path.node.loc;
      if (!loc) return;

      // Don't inject if data-oid already exists
      const hasDataOid = path.node.attributes.some(
        (attr) =>
          attr.type === "JSXAttribute" &&
          attr.name.type === "JSXIdentifier" &&
          attr.name.name === "data-oid",
      );
      if (hasDataOid) return;

      const dataOid = formatDataOid({
        type: "c",
        projectHash,
        filePath: relativePath,
        line: loc.start.line,
        column: loc.start.column + 1,
      });

      path.node.attributes.push({
        type: "JSXAttribute",
        name: { type: "JSXIdentifier", name: "data-oid" },
        value: { type: "StringLiteral", value: dataOid },
      });
    },
  });

  return generate(ast, { retainLines: true }).code;
}
