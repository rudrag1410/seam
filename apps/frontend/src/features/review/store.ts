import type { FitCheck, JDAnalysis, MatchScore, Resume, SuggestionOut, TailorSessionOut } from "@seam/api-client";
import { create } from "zustand";
import { type ViewMode, sortSuggestions } from "../resume-canvas/view-model";

type Decision = SuggestionOut["status"];
type Snapshot = { id: string; status: Decision; edited_text: string | null };

/** A line in the conversation that only exists in this tab (asking for a rewrite, and the reply). */
export interface Note {
  id: number;
  role: "user" | "assistant";
  text: string;
  tone?: "error";
}

export interface ReviewState {
  sessionId: string | null;
  status: TailorSessionOut["status"] | "loading";
  resume: Resume | null;
  jd: JDAnalysis | null;
  fit: FitCheck | null;
  title: string;
  /** What the user sent: the pasted posting, or the link it was read from. */
  jdText: string;
  jdUrl: string | null;
  sections: string[];
  /** Pieces of work per section, and how many have finished, while suggestions are being written. */
  tasks: Record<string, number>;
  tasksDone: Record<string, number>;
  notes: Note[];
  /** A rewrite the user asked for is on its way. */
  asking: boolean;
  suggestions: SuggestionOut[];
  scoreBefore: MatchScore | null;
  scoreProjected: MatchScore | null;
  degraded: boolean;
  warnings: string[];
  error: { code: string; message: string; retryable: boolean } | null;
  reconnecting: boolean;
  mode: ViewMode;
  cursor: string | null;
  confirming: string | null;
  editing: string | null;
  activeReq: string | null;
  history: Snapshot[];
  dirty: Set<string>;

  /** Shows the run as started the moment the user sends, before the server has answered. */
  begin: (p: { resume: Resume; jdText: string; jdUrl: string | null; sections: string[] }) => void;
  hydrate: (s: TailorSessionOut) => void;
  say: (note: Omit<Note, "id">) => void;
  reset: () => void;
  addSuggestion: (s: SuggestionOut) => void;
  replaceSuggestion: (s: SuggestionOut) => void;
  patch: (p: Partial<ReviewState>) => void;
  decide: (id: string, status: Decision, editedText?: string) => void;
  undo: () => void;
  acceptSection: (section: string) => void;
  acceptAllSafe: () => void;
  move: (delta: 1 | -1) => void;
  setCursor: (id: string | null) => void;
  clearDirty: (ids: string[]) => void;
}

const initial = {
  sessionId: null, status: "loading" as const, resume: null, jd: null, fit: null, title: "", jdText: "", jdUrl: null,
  sections: [], tasks: {}, tasksDone: {}, notes: [], asking: false, suggestions: [],
  scoreBefore: null, scoreProjected: null, degraded: false, warnings: [], error: null,
  reconnecting: false, mode: "suggestions" as ViewMode, cursor: null, confirming: null,
  editing: null, activeReq: null, history: [], dirty: new Set<string>(),
};

export const useReview = create<ReviewState>((set, get) => ({
  ...initial,

  begin: (p) => set({ ...initial, dirty: new Set(), status: "queued", ...p }),

  say: (note) => set((cur) => ({ notes: [...cur.notes, { ...note, id: cur.notes.length + 1 }] })),

  hydrate: (s) =>
    set((cur) => {
      const same = cur.sessionId === s.id;
      // keep local, not-yet-synced decisions when the same session is re-fetched
      const local = new Map(cur.suggestions.map((x) => [x.id, x]));
      const suggestions = s.suggestions.map((x) =>
        same && cur.dirty.has(x.id) ? { ...x, status: local.get(x.id)!.status, edited_text: local.get(x.id)!.edited_text } : x,
      );
      return {
        ...(same ? {} : initial),
        sessionId: s.id, status: s.status, resume: s.resume, jd: s.jd, fit: s.fit ?? null,
        title: [s.jd?.title || s.jd_title, s.jd?.company || s.jd_company].filter(Boolean).join(" · "),
        jdText: s.jd_text, jdUrl: s.jd_url, sections: s.sections,
        suggestions: sortSuggestions(s.resume, suggestions), scoreBefore: s.score_before, scoreProjected: s.score_after,
        degraded: s.degraded,
        error: s.status === "failed" ? { code: s.error_code ?? "TAILOR_FAILED", message: s.error_message ?? "Generation failed.", retryable: true } : null,
        cursor: same ? cur.cursor : (suggestions.find((x) => x.status === "pending")?.id ?? null),
        dirty: same ? cur.dirty : new Set<string>(),
        mode: same ? cur.mode : s.status === "finalized" ? "clean" : "suggestions",
      };
    }),

  reset: () => set({ ...initial, dirty: new Set() }),

  addSuggestion: (s) =>
    set((cur) => {
      if (cur.suggestions.some((x) => x.id === s.id)) return {};
      const suggestions = sortSuggestions(cur.resume, [...cur.suggestions, s]);
      return { suggestions, cursor: cur.cursor ?? s.id };
    }),

  replaceSuggestion: (s) =>
    set((cur) => ({ suggestions: cur.suggestions.map((x) => (x.id === s.id ? s : x)), cursor: s.id, editing: null, confirming: null })),

  patch: (p) => set(p),

  decide: (id, status, editedText) => {
    const cur = get();
    const target = cur.suggestions.find((s) => s.id === id);
    if (!target) return;
    // one-tap confirmation for anything that claims something new
    if (status === "accepted" && target.requires_confirmation && cur.confirming !== id) {
      set({ confirming: id });
      return;
    }
    const prev: Snapshot = { id, status: target.status, edited_text: target.edited_text ?? null };
    const suggestions = cur.suggestions.map((s) =>
      s.id === id ? { ...s, status, edited_text: status === "edited" ? (editedText ?? null) : null } : s,
    );
    const dirty = new Set(cur.dirty).add(id);
    // advance to the next pending suggestion so review flows
    const order = suggestions;
    const idx = order.findIndex((s) => s.id === id);
    const next = [...order.slice(idx + 1), ...order.slice(0, idx)].find((s) => s.status === "pending");
    set({
      suggestions, dirty, history: [...cur.history, prev], confirming: null, editing: null,
      cursor: status === "pending" ? id : (next?.id ?? id),
    });
  },

  undo: () => {
    const cur = get();
    const last = cur.history.at(-1);
    if (!last) return;
    set({
      history: cur.history.slice(0, -1),
      dirty: new Set(cur.dirty).add(last.id),
      cursor: last.id,
      suggestions: cur.suggestions.map((s) => (s.id === last.id ? { ...s, status: last.status, edited_text: last.edited_text } : s)),
    });
  },

  acceptSection: (section) => {
    const cur = get();
    const dirty = new Set(cur.dirty);
    const history = [...cur.history];
    const suggestions = cur.suggestions.map((s) => {
      // flagged suggestions always need an individual confirmation
      if (s.section !== section || s.status !== "pending" || s.requires_confirmation) return s;
      dirty.add(s.id);
      history.push({ id: s.id, status: s.status, edited_text: s.edited_text ?? null });
      return { ...s, status: "accepted" as const };
    });
    set({ suggestions, dirty, history });
  },

  acceptAllSafe: () => {
    const sections = new Set(get().suggestions.map((s) => s.section));
    for (const sec of sections) get().acceptSection(sec);
  },

  move: (delta) => {
    const { suggestions, cursor } = get();
    if (!suggestions.length) return;
    const idx = suggestions.findIndex((s) => s.id === cursor);
    const next = suggestions[(idx + delta + suggestions.length) % suggestions.length];
    set({ cursor: next?.id ?? null, confirming: null, editing: null });
  },

  setCursor: (id) => set({ cursor: id, confirming: null, editing: null }),

  clearDirty: (ids) =>
    set((cur) => {
      const dirty = new Set(cur.dirty);
      for (const id of ids) dirty.delete(id);
      return { dirty };
    }),
}));

export const selectPendingCount = (s: ReviewState) => s.suggestions.filter((x) => x.status === "pending").length;
