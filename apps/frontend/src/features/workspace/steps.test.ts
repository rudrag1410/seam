import type { JDAnalysis, MatchScore, SuggestionOut } from "@seam/api-client";
import { describe, expect, it } from "vitest";
import { buildSteps, closingMessage } from "./steps";

type Run = Parameters<typeof buildSteps>[0];

const jd = { title: "Backend Engineer", company: "Acme", must_haves: [{ id: "r1", text: "Kafka." }], nice_to_haves: [] } as unknown as JDAnalysis;
const score = (total: number, missing = false) =>
  ({ total, requirements: [{ id: "r1", text: "Kafka.", must_have: true, verdict: missing ? "missing" : "demonstrated" }] }) as unknown as MatchScore;
const sug = (id: string, section: string, o: Partial<SuggestionOut> = {}) =>
  ({ id, section, status: "pending", requires_confirmation: false, ...o }) as SuggestionOut;

const run = (o: Partial<Run> = {}): Run => ({
  status: "queued", jd: null, title: "", scoreBefore: null, scoreProjected: null, suggestions: [],
  sections: ["summary", "skills", "experience"], tasks: {}, tasksDone: {}, ...o,
});
const states = (r: Run) => buildSteps(r).map((s) => s.state);

describe("buildSteps", () => {
  it("starts by reading the job, with the rest waiting", () => {
    expect(states(run())).toEqual(["running", "pending", "pending"]);
  });

  it("scores and writes together once the job is read", () => {
    expect(states(run({ status: "running", jd }))).toEqual(["done", "running", "running"]);
  });

  it("ticks sections off as their pieces finish", () => {
    const steps = buildSteps(
      run({
        status: "running", jd, scoreBefore: score(60),
        tasks: { summary: 1, experience: 2 }, tasksDone: { summary: 1, experience: 1 },
        suggestions: [sug("a", "summary"), sug("b", "experience")],
      }),
    );
    // skills was asked for but the resume has no skills section, so it isn't listed
    expect(steps[2]!.parts!.map((p) => [p.key, p.state, p.count])).toEqual([
      ["summary", "done", 1],
      ["experience", "running", 1],
    ]);
    expect(steps[2]!.summary).toBe("2 so far");
  });

  it("marks everything done when the run is ready, even without a plan (a reloaded session)", () => {
    const steps = buildSteps(run({ status: "ready", jd, scoreBefore: score(60), suggestions: [sug("a", "summary")] }));
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "done"]);
    expect(steps[2]!.parts!.every((p) => p.state === "done")).toBe(true);
    expect(steps[2]!.summary).toBe("1 suggestion across 1 section");
  });

  it("stops at the step that failed and leaves later ones waiting", () => {
    expect(states(run({ status: "failed" }))).toEqual(["failed", "pending", "pending"]);
    expect(states(run({ status: "failed", jd, scoreBefore: score(60) }))).toEqual(["done", "done", "failed"]);
  });
});

describe("closingMessage", () => {
  it("says nothing until the run is over", () => {
    expect(closingMessage(run({ status: "running", jd }))).toBeNull();
  });

  it("handles a resume that needs no changes", () => {
    expect(closingMessage(run({ status: "ready", jd }))).toMatch(/no changes to suggest/);
  });

  it("names the role, the score range, the main gap and anything that needs confirming", () => {
    const text = closingMessage(
      run({
        status: "ready", jd, scoreBefore: score(61, true), scoreProjected: score(78),
        suggestions: [sug("a", "summary"), sug("b", "skills", { requires_confirmation: true })],
      }),
    )!;
    expect(text).toContain("Acme's Backend Engineer role");
    expect(text).toContain("found 2 suggestions");
    expect(text).toContain("61 now and could reach 78");
    expect(text).toContain("The main gap: Kafka.");
    expect(text).toContain("One adds something your resume doesn't state");
  });
});
