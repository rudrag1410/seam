import { type ClientErrorCode, Decision, type ErrorCode, type FitCheck, type JDAnalysis, type MatchScore, type Resume, SectionName, type SessionStatus, type SuggestionOut } from "@seam/api-client";
import { create } from "zustand";
import { ViewMode } from "../resume-canvas/view-model";

/** What a suggestion looked like before a decision, so the decision can be undone. */
export type Snapshot = { id: string; status: Decision; edited_text: string | null };

/** A number per section. */
export type SectionCounts = Partial<Record<SectionName, number>>;

export enum NoteRole {
  User = "user",
  Assistant = "assistant",
}

export enum NoteTone {
  Error = "error",
}

/** A line in the conversation that only exists in this tab (asking for a rewrite, and the reply). */
export interface Note {
  id: number;
  role: NoteRole;
  text: string;
  tone?: NoteTone;
}

/** Why a run failed, as the conversation shows it. */
export interface RunError {
  code: ErrorCode | ClientErrorCode;
  message: string;
  retryable: boolean;
}

/** Everything the tailoring screen shows. This file only holds the state; `actions.ts` is the
 *  one place that changes it. */
export interface ReviewState {
  sessionId: string | null;
  /** Where the run is, or null while nothing has been opened or sent yet. */
  status: SessionStatus | null;
  resume: Resume | null;
  jd: JDAnalysis | null;
  fit: FitCheck | null;
  title: string;
  /** What the user sent: the pasted posting, or the link it was read from. */
  jdText: string;
  jdUrl: string | null;
  sections: SectionName[];
  /** Pieces of work per section, and how many have finished, while suggestions are being written. */
  tasks: SectionCounts;
  tasksDone: SectionCounts;
  notes: Note[];
  /** A rewrite the user asked for is on its way. */
  asking: boolean;
  suggestions: SuggestionOut[];
  scoreBefore: MatchScore | null;
  scoreProjected: MatchScore | null;
  degraded: boolean;
  warnings: string[];
  error: RunError | null;
  reconnecting: boolean;
  mode: ViewMode;
  cursor: string | null;
  confirming: string | null;
  editing: string | null;
  activeReq: string | null;
  history: Snapshot[];
  /** Suggestions whose decision hasn't been saved yet. */
  dirty: Set<string>;
}

export function initialState(): ReviewState {
  return {
    sessionId: null, status: null, resume: null, jd: null, fit: null, title: "", jdText: "", jdUrl: null,
    sections: [], tasks: {}, tasksDone: {}, notes: [], asking: false, suggestions: [],
    scoreBefore: null, scoreProjected: null, degraded: false, warnings: [], error: null,
    reconnecting: false, mode: ViewMode.Suggestions, cursor: null, confirming: null,
    editing: null, activeReq: null, history: [], dirty: new Set<string>(),
  };
}

export const useReview = create<ReviewState>(initialState);

export function pendingCount(s: ReviewState): number {
  return s.suggestions.filter((x) => x.status === Decision.Pending).length;
}

/** Ids of the suggestions that will be in the saved version. */
export function acceptedIds(suggestions: SuggestionOut[]): Set<string> {
  return new Set(suggestions.filter((x) => x.status === Decision.Accepted || x.status === Decision.Edited).map((x) => x.id));
}
