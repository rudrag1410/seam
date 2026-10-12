import {
  Decision,
  type JDAnalysis,
  type MatchScore,
  SectionName,
  SessionStatus,
  type SuggestionOut,
  Verdict,
} from "@seam/api-client";
import { describe, expect, it } from "vitest";
import { StepState, buildSteps, closingMessage } from "./steps";

type Run = Parameters<typeof buildSteps>[0];

const jd = {
  title: "Backend Engineer",
  company: "Acme",
  must_haves: [{ id: "r1", text: "Kafka." }],
  nice_to_haves: [],
} as unknown as JDAnalysis;
const score = (total: number, missing = false) =>
  ({
    total,
    requirements: [
      {
        id: "r1",
        text: "Kafka.",
        must_have: true,
        verdict: missing ? Verdict.Missing : Verdict.Demonstrated,
      },
    ],
  }) as unknown as MatchScore;
const sug = (id: string, section: SectionName, o: Partial<SuggestionOut> = {}) =>
  ({ id, section, status: Decision.Pending, requires_confirmation: false, ...o }) as SuggestionOut;

const run = (o: Partial<Run> = {}): Run => ({
  status: SessionStatus.Queued,
  jd: null,
  title: "",
  scoreBefore: null,
  scoreProjected: null,
  suggestions: [],
  sections: [SectionName.Summary, SectionName.Skills, SectionName.Experience],
  tasks: {},
  tasksDone: {},
  ...o,
});
const states = (r: Run) => buildSteps(r).map((s) => s.state);

describe("buildSteps", () => {
  it("starts by reading the job, with the rest waiting", () => {
    expect(states(run())).toEqual([StepState.Running, StepState.Pending, StepState.Pending]);
  });

  it("scores and writes together once the job is read", () => {
    expect(states(run({ status: SessionStatus.Running, jd }))).toEqual([
      StepState.Done,
      StepState.Running,
      StepState.Running,
    ]);
  });

  it("ticks sections off as their pieces finish", () => {
    const steps = buildSteps(
      run({
        status: SessionStatus.Running,
        jd,
        scoreBefore: score(60),
        tasks: { [SectionName.Summary]: 1, [SectionName.Experience]: 2 },
        tasksDone: { [SectionName.Summary]: 1, [SectionName.Experience]: 1 },
        suggestions: [sug("a", SectionName.Summary), sug("b", SectionName.Experience)],
      }),
    );
    expect(steps[2]!.parts!.map((p) => [p.key, p.state, p.count])).toEqual([
      [SectionName.Summary, StepState.Done, 1],
      [SectionName.Experience, StepState.Running, 1],
    ]);
    expect(steps[2]!.summary).toBe("2 so far");
  });

  it("marks everything done when the run is ready, even without a plan (a reloaded session)", () => {
    const steps = buildSteps(
      run({
        status: SessionStatus.Ready,
        jd,
        scoreBefore: score(60),
        suggestions: [sug("a", SectionName.Summary)],
      }),
    );
    expect(steps.map((s) => s.state)).toEqual([StepState.Done, StepState.Done, StepState.Done]);
    expect(steps[2]!.parts!.every((p) => p.state === StepState.Done)).toBe(true);
    expect(steps[2]!.summary).toBe("1 suggestion across 1 section");
  });

  it("stops at the step that failed and leaves later ones waiting", () => {
    expect(states(run({ status: SessionStatus.Failed }))).toEqual([
      StepState.Failed,
      StepState.Pending,
      StepState.Pending,
    ]);
    expect(states(run({ status: SessionStatus.Failed, jd, scoreBefore: score(60) }))).toEqual([
      StepState.Done,
      StepState.Done,
      StepState.Failed,
    ]);
  });
});

describe("closingMessage", () => {
  it("says nothing until the run is over", () => {
    expect(closingMessage(run({ status: SessionStatus.Running, jd }))).toBeNull();
  });

  it("handles a resume that needs no changes", () => {
    expect(closingMessage(run({ status: SessionStatus.Ready, jd }))).toMatch(
      /no changes to suggest/,
    );
  });

  it("names the role, the score range, the main gap and anything that needs confirming", () => {
    const text = closingMessage(
      run({
        status: SessionStatus.Ready,
        jd,
        scoreBefore: score(61, true),
        scoreProjected: score(78),
        suggestions: [
          sug("a", SectionName.Summary),
          sug("b", SectionName.Skills, { requires_confirmation: true }),
        ],
      }),
    )!;
    expect(text).toContain("Acme's Backend Engineer role");
    expect(text).toContain("found 2 suggestions");
    expect(text).toContain("61 now and could reach 78");
    expect(text).toContain("The main gap: Kafka.");
    expect(text).toContain("One adds something your resume doesn't state");
  });
});
