import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

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

interface CommentScan {
  path: string;
  text: string;
  source: ts.SourceFile;
  seen: Set<number>;
  found: string[];
}

function scanComments(scan: CommentScan, node: ts.Node): void {
  if (node.kind !== ts.SyntaxKind.JsxText) {
    for (const range of ts.getLeadingCommentRanges(scan.text, node.getFullStart()) ?? []) {
      if (scan.seen.has(range.pos)) continue;
      scan.seen.add(range.pos);
      scan.found.push(`${relative(REPO, scan.path)}:${scan.source.getLineAndCharacterOfPosition(range.pos).line + 1}`);
    }
  }
  for (const child of node.getChildren(scan.source)) scanComments(scan, child);
}

function commentsIn(path: string): string[] {
  const text = readFileSync(path, "utf8");
  const kind = path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const scan: CommentScan = { path, text, source, seen: new Set(), found: [] };
  scanComments(scan, source);
  return scan.found;
}

describe("code shape", () => {
  it("has no comments", () => {
    const problems = ROOTS.flatMap((root) => sourceFiles(join(REPO, root))).flatMap(commentsIn);
    expect(problems).toEqual([]);
  });

  it("declares no function or component inside another function", () => {
    const problems = ROOTS.flatMap((root) => sourceFiles(join(REPO, root))).flatMap(nestedDeclarations);
    expect(problems).toEqual([]);
  });
});
