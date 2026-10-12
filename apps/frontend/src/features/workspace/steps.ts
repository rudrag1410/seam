import { SectionName, SessionStatus, Verdict } from "@seam/api-client";
import type { ReviewState } from "../review/store";

/** Pure translation of the run's state into the steps the conversation shows.
 *  Kept free of React so every stage of a run can be unit-tested. */

export enum StepState {
  Pending = "pending",
  Running = "running",
  Done = "done",
  Failed = "failed",
}

export enum StepKey {
  Read = "read",
  Score = "score",
  Write = "write",
}

export interface StepPart {
  key: SectionName;
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

const SECTION_ORDER = [SectionName.Summary, SectionName.Skills, SectionName.Experience, SectionName.Projects];
export const SECTION_LABEL: Record<SectionName, string> = {
  [SectionName.Summary]: "Summary",
  [SectionName.Skills]: "Skills",
  [SectionName.Experience]: "Experience",
  [SectionName.Projects]: "Projects",
};

function isFinished(s: RunState): boolean {
  return s.status === SessionStatus.Ready || s.status === SessionStatus.Finalized;
}

/** A finished step is done. Otherwise, once the step before it has finished, it is the one in
 *  progress (or the one that failed); until then it is waiting. */
function stepState(s: RunState, done: boolean, started: boolean): StepState {
  if (done) return StepState.Done;
  if (!started) return StepState.Pending;
  return s.status === SessionStatus.Failed ? StepState.Failed : StepState.Running;
}

function countBySection(s: RunState): Map<SectionName, number> {
  const counts = new Map<SectionName, number>();
  for (const x of s.suggestions) counts.set(x.section, (counts.get(x.section) ?? 0) + 1);
  return counts;
}

/** One line per section being written. Uses the server's plan when it has arrived; a session
 *  loaded after the fact has no plan, so it falls back to what was asked for and what was found. */
function sectionParts(s: RunState, writing: StepState): StepPart[] {
  const counts = countBySection(s);
  const planned = Object.keys(s.tasks).length > 0;
  const parts: StepPart[] = [];
  for (const section of SECTION_ORDER) {
    const listed = planned ? (s.tasks[section] ?? 0) > 0 : s.sections.includes(section) || counts.has(section);
    if (!listed) continue;
    const complete = isFinished(s) || (planned && (s.tasksDone[section] ?? 0) >= (s.tasks[section] ?? 0));
    parts.push({ key: section, label: SECTION_LABEL[section], count: counts.get(section) ?? 0, state: complete ? StepState.Done : writing });
  }
  return parts;
}

function writeSummary(s: RunState): string | undefined {
  const total = s.suggestions.length;
  if (!isFinished(s)) return total > 0 ? `${total} so far` : undefined;
  if (total === 0) return "No changes needed";
  return `${plural(total, "suggestion")} across ${plural(countBySection(s).size, "section")}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function buildSteps(s: RunState): Step[] {
  const reading = stepState(s, !!s.jd, true);
  const scoring = stepState(s, !!s.scoreBefore, !!s.jd);
  const writing = stepState(s, isFinished(s), !!s.jd);
  const must = s.jd?.must_haves.length ?? 0;
  return [
    {
      key: StepKey.Read,
      title: "Read the job description",
      state: reading,
      summary: s.jd ? [s.title, plural(must, "must-have")].filter(Boolean).join(" · ") : undefined,
    },
    {
      key: StepKey.Score,
      title: "Score your resume against it",
      state: scoring,
      summary: s.scoreBefore ? `${Math.round(s.scoreBefore.total)} out of 100 before any changes` : undefined,
    },
    { key: StepKey.Write, title: "Write suggestions", state: writing, summary: writeSummary(s), parts: sectionParts(s, writing) },
  ];
}

/** What the assistant says once the run is over. */
export function closingMessage(s: RunState): string | null {
  if (!isFinished(s)) return null;
  const total = s.suggestions.length;
  if (total === 0) return "Your resume already reads well for this role, so I have no changes to suggest.";

  const role = s.jd?.title || "this role";
  const where = s.jd?.company ? `${s.jd.company}'s ${role} role` : role;
  const out = [`I checked your resume against ${where} and found ${plural(total, "suggestion")}.`];

  const before = s.scoreBefore ? Math.round(s.scoreBefore.total) : null;
  const best = s.scoreProjected ? Math.round(s.scoreProjected.total) : null;
  if (before != null && best != null && best > before) out.push(`Your match is ${before} now and could reach ${best} if you accept them all.`);
  else if (before != null) out.push(`Your match is ${before} out of 100.`);

  const gaps = (s.scoreBefore?.requirements ?? []).filter((r) => r.must_have && r.verdict === Verdict.Missing);
  if (gaps.length > 0) out.push(`The main gap: ${gaps[0]!.text.replace(/\.$/, "")}.`);

  const flagged = s.suggestions.filter((x) => x.requires_confirmation).length;
  if (flagged > 0) {
    out.push(`${flagged === 1 ? "One adds" : `${flagged} add`} something your resume doesn't state, so accept ${flagged === 1 ? "it" : "those"} only if true.`);
  }
  return out.join(" ");
}
