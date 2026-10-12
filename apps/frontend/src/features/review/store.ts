import {
  type ClientErrorCode,
  Decision,
  type ErrorCode,
  type FitCheck,
  type JDAnalysis,
  type MatchScore,
  type Resume,
  type SectionName,
  type SessionStatus,
  type SuggestionOut,
} from "@seam/api-client";
import { create } from "zustand";
import { ViewMode } from "../resume-canvas/view-model";

export type Snapshot = { id: string; status: Decision; edited_text: string | null };

type SectionCounts = Partial<Record<SectionName, number>>;

export enum NoteRole {
  User = "user",
  Assistant = "assistant",
}

export enum NoteTone {
  Error = "error",
}

export interface Note {
  id: number;
  role: NoteRole;
  text: string;
  tone?: NoteTone;
}

interface RunError {
  code: ErrorCode | ClientErrorCode;
  message: string;
  retryable: boolean;
}

export interface ReviewState {
  sessionId: string | null;
  status: SessionStatus | null;
  resume: Resume | null;
  jd: JDAnalysis | null;
  fit: FitCheck | null;
  title: string;
  jdText: string;
  sections: SectionName[];
  tasks: SectionCounts;
  tasksDone: SectionCounts;
  notes: Note[];
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
  dirty: Set<string>;
}

export function initialState(): ReviewState {
  return {
    sessionId: null,
    status: null,
    resume: null,
    jd: null,
    fit: null,
    title: "",
    jdText: "",
    sections: [],
    tasks: {},
    tasksDone: {},
    notes: [],
    asking: false,
    suggestions: [],
    scoreBefore: null,
    scoreProjected: null,
    degraded: false,
    warnings: [],
    error: null,
    reconnecting: false,
    mode: ViewMode.Suggestions,
    cursor: null,
    confirming: null,
    editing: null,
    activeReq: null,
    history: [],
    dirty: new Set<string>(),
  };
}

export const useReview = create<ReviewState>(initialState);

export function pendingCount(s: ReviewState): number {
  return s.suggestions.filter((x) => x.status === Decision.Pending).length;
}

export function acceptedIds(suggestions: SuggestionOut[]): Set<string> {
  return new Set(
    suggestions
      .filter((x) => x.status === Decision.Accepted || x.status === Decision.Edited)
      .map((x) => x.id),
  );
}
