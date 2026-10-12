import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyOps, projectScore, wordDiff } from "../src";

const dir = join(__dirname, "../../fixtures/apply-ops");
const vectors = readdirSync(dir).filter((f) => f.endsWith(".json"));

describe("applyOps parity with the backend", () => {
  it.each(vectors)("%s", (file) => {
    const c = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const snapshot = JSON.stringify(c.document);
    expect(applyOps(c.document, c.ops)).toEqual(c.expected);
    expect(JSON.stringify(c.document)).toBe(snapshot);
  });
});

describe("wordDiff", () => {
  it("marks only the changed words", () => {
    const runs = wordDiff("Built web apps for retail", "Built web apps for fintech");
    expect(runs.filter((r) => r.kind === "delete").map((r) => r.text.trim())).toEqual(["retail"]);
    expect(runs.filter((r) => r.kind === "insert").map((r) => r.text.trim())).toEqual(["fintech"]);
    expect(runs.map((r) => r.text).join("")).toContain("Built web apps for");
  });
});

describe("projectScore", () => {
  it("adds accepted deltas and clamps to 0..100", () => {
    const s = [
      { id: "a", score_delta: 4.5 },
      { id: "b", score_delta: 3 },
    ];
    expect(projectScore(60, s, new Set(["a"]))).toBe(64.5);
    expect(projectScore(99, s, new Set(["a", "b"]))).toBe(100);
    expect(projectScore(60, s, new Set())).toBe(60);
  });
});
