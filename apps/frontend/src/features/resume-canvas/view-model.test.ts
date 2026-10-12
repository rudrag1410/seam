import type { Resume, SuggestionOut } from "@seam/api-client";
import { describe, expect, it } from "vitest";
import { buildView, sortSuggestions } from "./view-model";

const resume = {
  contact: { name: "A", links: [] },
  sections: [
    { id: "summary", type: "summary", text: "Frontend engineer." },
    { id: "skills", type: "skills", groups: [{ id: "sk_1", label: "Languages", items: ["TypeScript"] }] },
    {
      id: "experience", type: "experience",
      items: [{ id: "exp_1", company: "Acme", title: "SDE", bullets: [
        { id: "exp_1.b1", text: "Built web apps" }, { id: "exp_1.b2", text: "Cut LCP by 38%" }] }],
    },
  ],
} as unknown as Resume;

const sug = (o: Partial<SuggestionOut> & Pick<SuggestionOut, "id" | "op" | "target" | "payload">): SuggestionOut => ({
  seq: 1, section: "experience", before: null, rationale: "", addresses: [], evidence: [], confidence: 0.8,
  requires_confirmation: false, flag_reason: null, score_delta: 1, checks: {}, status: "pending", edited_text: null, ...o,
});

const replace = sug({ id: "r", op: "replace_text", target: "exp_1.b1", payload: { after: "Built fast web apps" } });
const reorder = sug({ id: "o", op: "reorder", target: "exp_1", payload: { order: ["exp_1.b2", "exp_1.b1"] } });
const skill = sug({ id: "s", op: "add_skill", target: "sk_1", payload: { value: "GraphQL" }, requires_confirmation: true, section: "skills" });

const exp = (v: ReturnType<typeof buildView>) => v.find((s) => s.type === "experience")!;

describe("buildView", () => {
  it("shows pending replacements as a word diff", () => {
    const item = (exp(buildView(resume, [replace], "suggestions")) as any).items[0];
    expect(item.bullets[0].state).toBe("changed");
    expect(item.bullets[0].runs.some((r: any) => r.kind === "insert" && r.text.includes("fast"))).toBe(true);
  });

  it("settles accepted edits and restores rejected ones", () => {
    const accepted = (exp(buildView(resume, [{ ...replace, status: "accepted" }], "suggestions")) as any).items[0].bullets[0];
    expect(accepted).toMatchObject({ text: "Built fast web apps", state: "settled", runs: null });
    const rejected = (exp(buildView(resume, [{ ...replace, status: "rejected" }], "suggestions")) as any).items[0].bullets[0];
    expect(rejected).toMatchObject({ text: "Built web apps", state: "plain" });
  });

  it("uses edited text once the user rewrites a suggestion", () => {
    const edited = { ...replace, status: "edited" as const, edited_text: "My own words" };
    expect((exp(buildView(resume, [edited], "suggestions")) as any).items[0].bullets[0].text).toBe("My own words");
  });

  it("reorders bullets and marks the moved one", () => {
    const bullets = (exp(buildView(resume, [reorder], "suggestions")) as any).items[0].bullets;
    expect(bullets.map((b: any) => b.id)).toEqual(["exp_1.b2", "exp_1.b1"]);
    expect(bullets[0]).toMatchObject({ state: "moved", movedFrom: 2 });
  });

  it("clean mode shows only what has been accepted, with no review marks", () => {
    const pending = (exp(buildView(resume, [replace, reorder], "clean")) as any).items[0];
    expect(pending.bullets.map((b: any) => b.text)).toEqual(["Built web apps", "Cut LCP by 38%"]);

    const accepted = [replace, reorder].map((x) => ({ ...x, status: "accepted" as const }));
    const item = (exp(buildView(resume, accepted, "clean")) as any).items[0];
    expect(item.bullets.map((b: any) => [b.text, b.state])).toEqual([["Cut LCP by 38%", "plain"], ["Built fast web apps", "plain"]]);
    expect(item.reorderId).toBeUndefined();
  });

  it("clean mode excludes flagged suggestions until the user accepts them", () => {
    const clean = (s: SuggestionOut[]) => (buildView(resume, s, "clean").find((x) => x.type === "skills") as any).groups[0].chips.map((c: any) => c.value);
    expect(clean([skill])).toEqual(["TypeScript"]);
    expect(clean([{ ...skill, status: "accepted" }])).toEqual(["TypeScript", "GraphQL"]);
  });

  it("original mode ignores every suggestion", () => {
    const item = (exp(buildView(resume, [replace, reorder], "original")) as any).items[0];
    expect(item.bullets.map((b: any) => b.text)).toEqual(["Built web apps", "Cut LCP by 38%"]);
  });
});

describe("sortSuggestions", () => {
  it("reviews top to bottom regardless of which section the model finished first", () => {
    const later = sug({ id: "x", seq: 1, op: "add_skill", target: "sk_1", payload: { value: "Go" }, section: "skills" });
    const bullet = sug({ id: "y", seq: 2, op: "replace_text", target: "exp_1.b2", payload: { after: "b" } });
    const summary = sug({ id: "z", seq: 3, op: "rewrite_summary", target: "summary", payload: { after: "s" }, section: "summary" });
    const arrivalOrder = [later, bullet, summary]; // experience and skills finished before the summary
    expect(sortSuggestions(resume, arrivalOrder).map((s) => s.id)).toEqual(["z", "x", "y"]);
  });

  it("falls back to arrival order for unknown targets and before the resume is loaded", () => {
    const a = sug({ id: "a", seq: 2, op: "replace_text", target: "gone", payload: { after: "" } });
    const b = sug({ id: "b", seq: 1, op: "replace_text", target: "gone", payload: { after: "" } });
    expect(sortSuggestions(resume, [a, b]).map((s) => s.id)).toEqual(["b", "a"]);
    expect(sortSuggestions(null, [a, b]).map((s) => s.id)).toEqual(["b", "a"]);
  });
});
