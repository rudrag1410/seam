import type { ReviewState } from "../review/store";

/** Pure translation of the run's state into the steps the conversation shows.
 *  Kept free of React so every stage of a run can be unit-tested. */

export type StepState = "pending" | "running" | "done" | "failed";
export type StepKey = "read" | "score" | "write";

export interface StepPart {
  key: string;
  label: string;
  state: StepState;
  count: number;
}

export interface Step {
  key: StepKey;
  title: string;
  state: StepState;
  summary?: string;
  parts?: StepPart[];
}

type RunState = Pick<
  ReviewState,
  "status" | "jd" | "title" | "scoreBefore" | "scoreProjected" | "suggestions" | "sections" | "tasks" | "tasksDone"
>;

const SECTION_ORDER = ["summary", "skills", "experience", "projects"];
export const SECTION_LABEL: Record<string, string> = {
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  projects: "Projects",
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function buildSteps(s: RunState): Step[] {
  const failed = s.status === "failed";
  const finished = s.status === "ready" || s.status === "finalized";
  // the first step that hasn't finished is the one in progress (or the one that failed)
  const done = { read: !!s.jd, score: !!s.scoreBefore, write: finished };
  const current: StepState = failed ? "failed" : "running";
  const state = (key: StepKey, started: boolean): StepState => (done[key] ? "done" : started ? current : "pending");

  const counts = new Map<string, number>();
  for (const x of s.suggestions) counts.set(x.section, (counts.get(x.section) ?? 0) + 1);
  const planned = Object.keys(s.tasks).length > 0;
  const writing = state("write", done.read);
  const parts: StepPart[] = SECTION_ORDER.filter((sec) =>
    planned ? (s.tasks[sec] ?? 0) > 0 : s.sections.includes(sec) || counts.has(sec),
  ).map((sec) => ({
    key: sec,
    label: SECTION_LABEL[sec] ?? sec,
    count: counts.get(sec) ?? 0,
    state: finished || (planned && (s.tasksDone[sec] ?? 0) >= (s.tasks[sec] ?? 0)) ? "done" : writing,
  }));

  const must = s.jd?.must_haves.length ?? 0;
  const total = s.suggestions.length;
  return [
    {
      key: "read",
      title: "Read the job description",
      state: state("read", true),
      summary: s.jd ? [s.title, plural(must, "must-have")].filter(Boolean).join(" · ") : undefined,
    },
    {
      key: "score",
      title: "Score your resume against it",
      state: state("score", done.read),
      summary: s.scoreBefore ? `${Math.round(s.scoreBefore.total)} out of 100 before any changes` : undefined,
    },
    {
      key: "write",
      title: "Write suggestions",
      state: writing,
      summary: finished
        ? total === 0
          ? "No changes needed"
          : `${plural(total, "suggestion")} across ${plural(counts.size, "section")}`
        : total > 0
          ? `${total} so far`
          : undefined,
      parts,
    },
  ];
}

/** What the assistant says once the run is over. */
export function closingMessage(s: RunState): string | null {
  if (s.status !== "ready" && s.status !== "finalized") return null;
  const total = s.suggestions.length;
  if (total === 0) return "Your resume already reads well for this role, so I have no changes to suggest.";

  const role = s.jd?.title || "this role";
  const where = s.jd?.company ? `${s.jd.company}'s ${role} role` : role;
  const out = [`I checked your resume against ${where} and found ${plural(total, "suggestion")}.`];

  const before = s.scoreBefore ? Math.round(s.scoreBefore.total) : null;
  const best = s.scoreProjected ? Math.round(s.scoreProjected.total) : null;
  if (before != null && best != null && best > before) out.push(`Your match is ${before} now and could reach ${best} if you accept them all.`);
  else if (before != null) out.push(`Your match is ${before} out of 100.`);

  const gaps = (s.scoreBefore?.requirements ?? []).filter((r) => r.must_have && r.verdict === "missing");
  if (gaps.length > 0) out.push(`The main gap: ${gaps[0]!.text.replace(/\.$/, "")}.`);

  const flagged = s.suggestions.filter((x) => x.requires_confirmation).length;
  if (flagged > 0) {
    out.push(`${flagged === 1 ? "One adds" : `${flagged} add`} something your resume doesn't state, so accept ${flagged === 1 ? "it" : "those"} only if true.`);
  }
  return out.join(" ");
}
