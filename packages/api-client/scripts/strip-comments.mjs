import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const COMMENT_KINDS = new Set([ts.SyntaxKind.SingleLineCommentTrivia, ts.SyntaxKind.MultiLineCommentTrivia]);

function commentRanges(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text);
  const ranges = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    if (COMMENT_KINDS.has(kind)) ranges.push([scanner.getTokenStart(), scanner.getTokenEnd()]);
  }
  return ranges;
}

function lineStart(text, pos) {
  return text.lastIndexOf("\n", pos - 1) + 1;
}

function lineEnd(text, pos) {
  const at = text.indexOf("\n", pos);
  return at === -1 ? text.length : at + 1;
}

function isBlank(text) {
  return text.trim() === "";
}

function removal([start, end], text) {
  const from = lineStart(text, start);
  const to = lineEnd(text, end);
  const alone = isBlank(text.slice(from, start)) && isBlank(text.slice(end, to));
  return alone ? [from, to] : [start, end];
}

function stripComments(text) {
  let out = "";
  let cursor = 0;
  for (const range of commentRanges(text)) {
    const [from, to] = removal(range, text);
    out += text.slice(cursor, from);
    cursor = to;
  }
  return out + text.slice(cursor);
}

for (const path of process.argv.slice(2)) {
  writeFileSync(path, stripComments(readFileSync(path, "utf8")));
}
