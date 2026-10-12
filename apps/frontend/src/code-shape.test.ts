import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/** House rule: no named function or component is declared inside another function. Helpers live
 *  at module level (or as class members), so each one can be read, named and tested alone.
 *  Anonymous callbacks handed straight to a call or a prop (effects, event handlers, map) are
 *  how React and the DOM work, and are not what this rule is about. */

const REPO = join(__dirname, "..", "..", "..");
const ROOTS = ["apps/frontend/src", "packages/ui/src", "packages/api-client/src", "packages/resume-core/src", "packages/resume-core/test"];
const SKIP = new Set(["node_modules", "dist"]);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) out.push(path);
  }
  return out;
}

function isFunction(node: ts.Node): boolean {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node);
}

/** The name a function is declared under, if the node declares one. */
function declaredName(node: ts.Node): string | null {
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
    return node.name.text;
  }
  return null;
}

function collect(node: ts.Node, source: ts.SourceFile, insideFunction: boolean, found: string[]): void {
  const name = insideFunction ? declaredName(node) : null;
  if (name) found.push(`${relative(REPO, source.fileName)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${name}`);
  const inside = insideFunction || isFunction(node);
  ts.forEachChild(node, (child) => collect(child, source, inside, found));
}

function nestedDeclarations(path: string): string[] {
  const found: string[] = [];
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  collect(source, source, false, found);
  return found;
}

describe("code shape", () => {
  it("declares no function or component inside another function", () => {
    const problems = ROOTS.flatMap((root) => sourceFiles(join(REPO, root))).flatMap(nestedDeclarations);
    expect(problems).toEqual([]);
  });
});
