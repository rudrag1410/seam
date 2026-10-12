import {
  Decision,
  ErrorCode,
  type Resume,
  type SectionName,
  SessionStatus,
  type SuggestionOut,
  type TailorSessionOut,
} from "@seam/api-client";
import { ViewMode, sortSuggestions } from "../resume-canvas/view-model";
import { type Note, type ReviewState, type Snapshot, initialState, useReview } from "./store";

type Change = Partial<ReviewState>;

function snapshot(s: SuggestionOut): Snapshot {
  return { id: s.id, status: s.status, edited_text: s.edited_text ?? null };
}

function withDecision(s: SuggestionOut, status: Decision, editedText?: string): SuggestionOut {
  return { ...s, status, edited_text: status === Decision.Edited ? (editedText ?? null) : null };
}

function nextPending(suggestions: SuggestionOut[], id: string): SuggestionOut | undefined {
  const at = suggestions.findIndex((s) => s.id === id);
  return [...suggestions.slice(at + 1), ...suggestions.slice(0, at)].find(
    (s) => s.status === Decision.Pending,
  );
}

function errorOf(session: TailorSessionOut): ReviewState["error"] {
  if (session.status !== SessionStatus.Failed) return null;
  return {
    code: session.error_code ?? ErrorCode.TailorFailed,
    message: session.error_message ?? "Generation failed.",
    retryable: true,
  };
}

function keepUnsaved(cur: ReviewState, incoming: SuggestionOut): SuggestionOut {
  const local = cur.suggestions.find((x) => x.id === incoming.id);
  return local && cur.dirty.has(incoming.id)
    ? { ...incoming, status: local.status, edited_text: local.edited_text }
    : incoming;
}

function hydrated(cur: ReviewState, session: TailorSessionOut): Change {
  const same = cur.sessionId === session.id;
  const base = same ? cur : initialState();
  const suggestions = sortSuggestions(
    session.resume,
    same ? session.suggestions.map((x) => keepUnsaved(cur, x)) : session.suggestions,
  );
  return {
    ...base,
    sessionId: session.id,
    status: session.status,
    resume: session.resume,
    jd: session.jd,
    fit: session.fit ?? null,
    title: [session.jd?.title || session.jd_title, session.jd?.company || session.jd_company]
      .filter(Boolean)
      .join(" · "),
    jdText: session.jd_text,
    sections: session.sections,
    suggestions,
    scoreBefore: session.score_before,
    scoreProjected: session.score_after,
    degraded: session.degraded,
    error: errorOf(session),
    cursor: same
      ? cur.cursor
      : (suggestions.find((x) => x.status === Decision.Pending)?.id ?? null),
    mode: same
      ? cur.mode
      : session.status === SessionStatus.Finalized
        ? ViewMode.Clean
        : ViewMode.Suggestions,
  };
}

function decided(cur: ReviewState, id: string, status: Decision, editedText?: string): Change {
  const target = cur.suggestions.find((s) => s.id === id);
  if (!target) return {};
  if (status === Decision.Accepted && target.requires_confirmation && cur.confirming !== id)
    return { confirming: id };
  const suggestions = cur.suggestions.map((s) =>
    s.id === id ? withDecision(s, status, editedText) : s,
  );
  return {
    suggestions,
    dirty: new Set(cur.dirty).add(id),
    history: [...cur.history, snapshot(target)],
    confirming: null,
    editing: null,
    cursor: status === Decision.Pending ? id : (nextPending(suggestions, id)?.id ?? id),
  };
}

function undone(cur: ReviewState): Change {
  const last = cur.history.at(-1);
  if (!last) return {};
  return {
    history: cur.history.slice(0, -1),
    dirty: new Set(cur.dirty).add(last.id),
    cursor: last.id,
    suggestions: cur.suggestions.map((s) =>
      s.id === last.id ? { ...s, status: last.status, edited_text: last.edited_text } : s,
    ),
  };
}

function isSafeToAccept(s: SuggestionOut, section: string | null): boolean {
  return (
    s.status === Decision.Pending &&
    !s.requires_confirmation &&
    (section === null || s.section === section)
  );
}

function acceptedInBulk(cur: ReviewState, section: string | null): Change {
  const chosen = cur.suggestions.filter((s) => isSafeToAccept(s, section));
  if (!chosen.length) return {};
  const ids = new Set(chosen.map((s) => s.id));
  return {
    suggestions: cur.suggestions.map((s) =>
      ids.has(s.id) ? withDecision(s, Decision.Accepted) : s,
    ),
    dirty: new Set([...cur.dirty, ...ids]),
    history: [...cur.history, ...chosen.map(snapshot)],
  };
}

function moved(cur: ReviewState, delta: 1 | -1): Change {
  const { suggestions, cursor } = cur;
  if (!suggestions.length) return {};
  const at = suggestions.findIndex((s) => s.id === cursor);
  const next = suggestions[(at + delta + suggestions.length) % suggestions.length];
  return { cursor: next?.id ?? null, confirming: null, editing: null };
}

function added(cur: ReviewState, s: SuggestionOut): Change {
  if (cur.suggestions.some((x) => x.id === s.id)) return {};
  return {
    suggestions: sortSuggestions(cur.resume, [...cur.suggestions, s]),
    cursor: cur.cursor ?? s.id,
  };
}

function cleaned(cur: ReviewState, ids: string[]): Change {
  const dirty = new Set(cur.dirty);
  for (const id of ids) dirty.delete(id);
  return { dirty };
}

export function reset(): void {
  useReview.setState(initialState());
}

export function begin(run: { resume: Resume; jdText: string; sections: SectionName[] }): void {
  useReview.setState({ ...initialState(), status: SessionStatus.Queued, ...run });
}

export function hydrate(session: TailorSessionOut): void {
  useReview.setState((cur) => hydrated(cur, session));
}

export function say(note: Omit<Note, "id">): void {
  useReview.setState((cur) => ({ notes: [...cur.notes, { ...note, id: cur.notes.length + 1 }] }));
}

export function addSuggestion(s: SuggestionOut): void {
  useReview.setState((cur) => added(cur, s));
}

export function replaceSuggestion(s: SuggestionOut): void {
  useReview.setState((cur) => ({
    suggestions: cur.suggestions.map((x) => (x.id === s.id ? s : x)),
    cursor: s.id,
    editing: null,
    confirming: null,
  }));
}

export function decide(id: string, status: Decision, editedText?: string): void {
  useReview.setState((cur) => decided(cur, id, status, editedText));
}

export function undo(): void {
  useReview.setState(undone);
}

export function acceptSection(section: string): void {
  useReview.setState((cur) => acceptedInBulk(cur, section));
}

export function acceptAllSafe(): void {
  useReview.setState((cur) => acceptedInBulk(cur, null));
}

export function move(delta: 1 | -1): void {
  useReview.setState((cur) => moved(cur, delta));
}

export function select(id: string | null): void {
  useReview.setState({ cursor: id, confirming: null, editing: null });
}

export function clearDirty(ids: string[]): void {
  useReview.setState((cur) => cleaned(cur, ids));
}
