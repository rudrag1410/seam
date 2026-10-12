import { dirname, join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const APP = join(__dirname, "..");
const REPO = join(APP, "..", "..");

function program(): ts.Program {
  const configPath = join(APP, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
  return ts.createProgram({ rootNames: parsed.fileNames, options: { ...parsed.options, noEmit: true } });
}

function isEnumType(type: ts.Type): boolean {
  const kinds = type.isUnion() ? type.types : [type];
  return kinds.length > 0 && kinds.every((t) => (t.flags & ts.TypeFlags.EnumLike) !== 0);
}

function isStringLiteral(node: ts.Node): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

const COMPARISONS = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

interface Scan {
  source: ts.SourceFile;
  checker: ts.TypeChecker;
  found: string[];
}

function report(scan: Scan, node: ts.Node, text: string): void {
  const { line } = scan.source.getLineAndCharacterOfPosition(node.getStart());
  scan.found.push(`${relative(REPO, scan.source.fileName)}:${line + 1} "${text}"`);
}

function checkComparison(scan: Scan, node: ts.BinaryExpression): void {
  if (!COMPARISONS.has(node.operatorToken.kind)) return;
  const [lit, other] = isStringLiteral(node.left) ? [node.left, node.right] : [node.right, node.left];
  if (isStringLiteral(lit) && isEnumType(scan.checker.getTypeAtLocation(other))) report(scan, lit, lit.text);
}

function checkCase(scan: Scan, node: ts.CaseClause): void {
  if (!isStringLiteral(node.expression)) return;
  const switched = (node.parent.parent as ts.SwitchStatement).expression;
  if (isEnumType(scan.checker.getTypeAtLocation(switched))) report(scan, node.expression, node.expression.text);
}

function checkArguments(scan: Scan, node: ts.CallExpression): void {
  const signature = scan.checker.getResolvedSignature(node);
  for (const [i, arg] of node.arguments.entries()) {
    const param = signature?.parameters[Math.min(i, signature.parameters.length - 1)];
    if (!param || !isStringLiteral(arg)) continue;
    if (isEnumType(scan.checker.getTypeOfSymbolAtLocation(param, node))) report(scan, arg, arg.text);
  }
}

function visit(scan: Scan, node: ts.Node): void {
  if (ts.isBinaryExpression(node)) checkComparison(scan, node);
  if (ts.isCaseClause(node)) checkCase(scan, node);
  if (ts.isCallExpression(node)) checkArguments(scan, node);
  ts.forEachChild(node, (child) => visit(scan, child));
}

function bareStrings(source: ts.SourceFile, checker: ts.TypeChecker): string[] {
  const scan: Scan = { source, checker, found: [] };
  visit(scan, source);
  return scan.found;
}

describe("enum use", () => {
  it("never writes an enum's value as a bare string", () => {
    const prog = program();
    const checker = prog.getTypeChecker();
    const problems = prog
      .getSourceFiles()
      .filter((f) => f.fileName.startsWith(join(APP, "src")) && !f.fileName.endsWith(".test.ts"))
      .flatMap((f) => bareStrings(f, checker));
    expect(problems).toEqual([]);
  }, 60_000);
});
