import DiffMatchPatch from "diff-match-patch";

export type DiffRun = { kind: "equal" | "insert" | "delete"; text: string };

const dmp = new DiffMatchPatch();
const KINDS = { "0": "equal", "1": "insert", "-1": "delete" } as const;

function encode(text: string, codes: Map<string, string>): string {
  let out = "";
  for (const token of text.match(/\s+|[^\s]+/g) ?? []) {
    if (!codes.has(token)) codes.set(token, String.fromCharCode(codes.size + 1));
    out += codes.get(token);
  }
  return out;
}

function decode(encoded: string, tokens: Map<string, string>): string {
  let out = "";
  for (const ch of encoded) out += tokens.get(ch) ?? "";
  return out;
}

export function wordDiff(before: string, after: string): DiffRun[] {
  const codes = new Map<string, string>();
  const a = encode(before, codes);
  const b = encode(after, codes);
  const tokens = new Map<string, string>();
  for (const [token, code] of codes) tokens.set(code, token);

  const diffs = dmp.diff_main(a, b);
  dmp.diff_cleanupSemantic(diffs);
  const runs: DiffRun[] = [];
  for (const [op, text] of diffs)
    runs.push({ kind: KINDS[String(op) as keyof typeof KINDS], text: decode(text, tokens) });
  return runs;
}
