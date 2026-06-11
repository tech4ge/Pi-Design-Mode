import { readFile } from "node:fs/promises";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { parseDataOid, type DataOidComponents } from "./data-oid.js";

export interface InspectResult {
  tagName: string;
  componentName?: string;
  filePath: string;
  line: number;
  column: number;
  props: Record<string, unknown>;
  textContent?: string;
  parentComponent?: string;
  parentFile?: string;
}

interface InspectParams {
  dataOid: string;
  filePath: string;
  computedStyles?: Record<string, string>;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export async function inspectElement(params: InspectParams): Promise<InspectResult | null> {
  const parsed = parseDataOid(params.dataOid);
  if (!parsed) return null;

  let source: string;
  try {
    source = await readFile(params.filePath, "utf-8");
  } catch {
    return null;
  }

  return extractElementInfo(source, params.filePath, parsed);
}

function extractElementInfo(
  source: string,
  filePath: string,
  parsed: DataOidComponents,
): InspectResult | null {
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  let result: InspectResult | null = null;

  traverse(ast, {
    JSXOpeningElement(path) {
      const loc = path.node.loc;
      if (!loc) return;
      if (loc.start.line !== parsed.line || loc.start.column + 1 !== parsed.column) return;

      const tagName = getTagName(path.node);
      const props = extractProps(path.node);

      // Find parent component name (supports function declarations and arrow function variable declarations)
      const parentFunc = path.findParent((p) =>
        p.isFunctionDeclaration() || p.isArrowFunctionExpression() || p.isFunctionExpression(),
      );

      let parentComponent: string | undefined;
      if (parentFunc?.isFunctionDeclaration()) {
        parentComponent = parentFunc.node.id?.name ?? undefined;
      } else if (parentFunc?.isArrowFunctionExpression() || parentFunc?.isFunctionExpression()) {
        // const MyComp = () => { ... }
        const varDeclarator = parentFunc.findParent((p) => p.isVariableDeclarator());
        if (varDeclarator?.isVariableDeclarator()) {
          const id = varDeclarator.node.id;
          if (id.type === "Identifier") {
            parentComponent = id.name;
          }
        }
      }

      // Find text content
      const textContent = extractTextContent(path);

      result = {
        tagName,
        componentName: tagName[0] === tagName[0].toUpperCase() ? tagName : undefined,
        filePath,
        line: parsed.line,
        column: parsed.column,
        props,
        textContent,
        parentComponent,
      };
    },
  });

  return result;
}

function getTagName(node: any): string {
  if (node.name.type === "JSXIdentifier") {
    return node.name.name;
  }
  if (node.name.type === "JSXMemberExpression") {
    return `${node.name.object.name}.${node.name.property.name}`;
  }
  return "unknown";
}

function extractProps(node: any): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const attr of node.attributes) {
    if (attr.type !== "JSXAttribute") continue;
    if (attr.name.type !== "JSXIdentifier") continue;
    const name = attr.name.name;
    if (name === "data-oid") continue; // Skip our own attribute

    if (!attr.value) {
      props[name] = true; // Boolean prop
    } else if (attr.value.type === "StringLiteral") {
      props[name] = attr.value.value;
    } else if (attr.value.type === "JSXExpressionContainer") {
      props[name] = "{expression}"; // Can't statically evaluate
    }
  }
  return props;
}

function extractTextContent(path: any): string | undefined {
  const parent = path.parent;
  if (parent.type !== "JSXElement") return undefined;

  const children = parent.children
    ?.filter((c) => c.type === "JSXText")
    .map((c) => c.value.trim())
    .filter(Boolean);

  return children?.join(" ") || undefined;
}
