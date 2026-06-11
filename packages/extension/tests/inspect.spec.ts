import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { inspectElement } from "../src/inspect.js";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dirname, "__fixtures__");

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(join(FIXTURE_DIR, "Header.tsx"), `import { NavButton } from "./NavButton";

export function Header() {
  return (
    <header className="bg-blue-500 p-4">
      <h1 className="text-xl font-bold">My App</h1>
      <NavButton variant="primary" href="/about">About</NavButton>
    </header>
  );
}
`);

  writeFileSync(join(FIXTURE_DIR, "Arrow.tsx"), `const Button = (props) => {
  return <button className="btn">{props.label}</button>;
};

export default Button;
`);
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

describe("inspectElement", () => {
  it("extracts component info from a data-oid pointing to a JSX element", async () => {
    // header element at line 5, column 5 (zero-indexed from Babel = column 6 in data-oid)
    const result = await inspectElement({
      dataOid: `c:abc12345:r:Header.tsx:5:5`,
      filePath: join(FIXTURE_DIR, "Header.tsx"),
    });

    expect(result).toMatchObject({
      tagName: "header",
      filePath: expect.stringContaining("Header.tsx"),
      line: 5,
      column: 5,
      props: expect.objectContaining({
        className: expect.stringContaining("bg-blue-500"),
      }),
    });
  });

  it("extracts custom component info", async () => {
    const result = await inspectElement({
      dataOid: `c:abc12345:r:Header.tsx:7:7`,
      filePath: join(FIXTURE_DIR, "Header.tsx"),
    });

    expect(result).toMatchObject({
      componentName: "NavButton",
      props: expect.objectContaining({
        variant: "primary",
        href: "/about",
      }),
    });
  });

  it("returns null for a file that doesn't exist", async () => {
    const result = await inspectElement({
      dataOid: `c:abc12345:r:Missing.tsx:1:1`,
      filePath: join(FIXTURE_DIR, "Missing.tsx"),
    });

    expect(result).toBeNull();
  });

  it("extracts parentComponent from arrow function variable declaration", async () => {
    const result = await inspectElement({
      dataOid: `c:abc12345:r:Arrow.tsx:2:10`,
      filePath: join(FIXTURE_DIR, "Arrow.tsx"),
    });

    expect(result).not.toBeNull();
    expect(result!.parentComponent).toBe("Button");
    expect(result!.tagName).toBe("button");
    expect(result!.props).toMatchObject({ className: "btn" });
  });
});
