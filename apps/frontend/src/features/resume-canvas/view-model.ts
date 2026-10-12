import type { Resume, SuggestionOut } from "@seam/api-client";
import { type DiffRun, wordDiff } from "@seam/resume-core";

/** Pure translation of (resume, suggestions, decisions) into what the canvas draws.
 *  Kept free of React so every review state can be unit-tested. */

export type ViewMode = "suggestions" | "clean" | "original";
export type NodeState = "plain" | "changed" | "inserted" | "removed" | "moved" | "settled";

export interface BulletView {
  id: string;
  text: string;
  runs: DiffRun[] | null;
  state: NodeState;
  suggestionId?: string;
  suggestionIds: string[];
  flagged: boolean;
  movedFrom?: number;
}

export interface ItemView {
  id: string;
  title: string;
  subtitle: string;
  dates: string;
  bullets: BulletView[];
  reorderId?: string;
  reorderPending: boolean;
}

export interface SkillChip {
  key: string;
  value: string;
  state: NodeState;
  suggestionId?: string;
  flagged: boolean;
}

export type SectionView =
  | { id: string; type: "summary"; label: string; node: BulletView }
  | { id: string; type: "skills"; label: string; groups: { id: string; label: string; chips: SkillChip[] }[] }
  | { id: string; type: "experience" | "projects"; label: string; items: ItemView[] }
  | { id: string; type: "education"; label: string; items: { id: string; title: string; subtitle: string; dates: string; details?: string | null }[] }
  | { id: string; type: "other"; label: string; lines: string[] };

const LABELS = { summary: "Summary", skills: "Skills", experience: "Experience", projects: "Projects", education: "Education" };

/** Suggestions shows everything still in play. Clean shows exactly what finalizing would save:
 *  the changes that have been accepted, with no review marks. Original shows none. */
const live = (s: SuggestionOut, mode: ViewMode) =>
  mode === "suggestions" ? s.status !== "rejected" : mode === "clean" && (s.status === "accepted" || s.status === "edited");

function after(s: SuggestionOut): string {
  return s.status === "edited" && s.edited_text ? s.edited_text : String((s.payload as { after?: string }).after ?? "");
}

function dateRange(a?: string | null, b?: string | null) {
  const f = (v?: string | null) => {
    if (!v) return "";
    if (/^(present|current|now)$/i.test(v)) return "Present";
    const m = /^(\d{4})-(\d{2})$/.exec(v);
    return m ? `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m[2]) - 1]} ${m[1]}` : v;
  };
  return [f(a), f(b)].filter(Boolean).join(" – ");
}

export function buildView(resume: Resume, suggestions: SuggestionOut[], mode: ViewMode): SectionView[] {
  const active = suggestions.filter((s) => live(s, mode));
  const byTarget = new Map<string, SuggestionOut[]>();
  for (const s of active) byTarget.set(s.target, [...(byTarget.get(s.target) ?? []), s]);
  const forTarget = (id: string, ...ops: string[]) => byTarget.get(id)?.find((s) => ops.includes(s.op));

  const textNode = (id: string, original: string, ...ops: string[]): BulletView => {
    const s = forTarget(id, ...ops);
    if (!s) return { id, text: original, runs: null, state: "plain", suggestionIds: [], flagged: false };
    const base = { id, suggestionId: s.id, suggestionIds: [s.id], flagged: s.requires_confirmation };
    if (s.status === "pending" && mode === "suggestions") {
      return { ...base, text: after(s), runs: wordDiff(original, after(s)), state: "changed" };
    }
    return { ...base, text: after(s), runs: null, state: s.status === "pending" || mode === "clean" ? "plain" : "settled" };
  };

  const buildItem = (item: { id: string; bullets: { id: string; text: string }[] }, title: string, subtitle: string, dates: string): ItemView => {
    const reorder = forTarget(item.id, "reorder");
    const order = reorder ? ((reorder.payload as { order: string[] }).order ?? []) : [];
    const listed = new Set(order);
    const baseIds = item.bullets.map((b) => b.id);
    const ordered = reorder ? [...order.filter((i) => baseIds.includes(i)), ...baseIds.filter((i) => !listed.has(i))] : baseIds;

    const views: BulletView[] = [];
    for (const [pos, id] of ordered.entries()) {
      const original = item.bullets.find((b) => b.id === id)!.text;
      const removal = forTarget(id, "remove_bullet");
      if (removal && removal.status !== "pending") continue; // accepted removal: gone
      const v = removal ? { ...textNode(id, original), state: "removed" as const, suggestionId: removal.id, suggestionIds: [removal.id] }
        : textNode(id, original, "replace_text");
      const from = baseIds.indexOf(id);
      if (reorder && from !== pos && mode === "suggestions") {
        v.suggestionIds = [...v.suggestionIds, reorder.id];
        if (v.state === "plain") v.state = "moved";
        v.movedFrom = from + 1;
      }
      views.push(v);
    }
    for (const s of active.filter((x) => x.op === "insert_bullet" && x.target === item.id)) {
      const p = s.payload as { new_id: string };
      views.push({
        id: p.new_id, text: after(s), runs: null, flagged: s.requires_confirmation,
        state: mode === "clean" ? "plain" : s.status === "pending" ? "inserted" : "settled",
        suggestionId: s.id, suggestionIds: [s.id],
      });
    }
    return {
      id: item.id, title, subtitle, dates, bullets: views,
      reorderId: mode === "suggestions" ? reorder?.id : undefined, reorderPending: reorder?.status === "pending",
    };
  };

  return resume.sections.map((sec): SectionView => {
    if (sec.type === "summary") return { id: sec.id, type: "summary", label: LABELS.summary, node: textNode(sec.id, sec.text, "rewrite_summary", "replace_text") };
    if (sec.type === "skills") {
      return {
        id: sec.id, type: "skills", label: LABELS.skills,
        groups: sec.groups.map((g) => {
          const chips: SkillChip[] = [];
          const removed = new Map<string, SuggestionOut>();
          for (const s of active.filter((x) => x.op === "remove_skill" && x.target === g.id)) {
            removed.set(String((s.payload as { value: string }).value).toLowerCase(), s);
          }
          for (const item of g.items) {
            const r = removed.get(item.toLowerCase());
            if (r && r.status !== "pending") continue;
            chips.push({ key: item, value: item, state: r ? "removed" : "plain", suggestionId: r?.id, flagged: false });
          }
          for (const s of active.filter((x) => x.op === "add_skill" && x.target === g.id)) {
            const value = s.status === "edited" && s.edited_text ? s.edited_text : String((s.payload as { value: string }).value);
            if (g.items.some((i) => i.toLowerCase() === value.toLowerCase())) continue;
            chips.push({
              key: `add:${s.id}`, value, flagged: s.requires_confirmation, suggestionId: s.id,
              state: mode === "clean" ? "plain" : s.status === "pending" ? "inserted" : "settled",
            });
          }
          return { id: g.id, label: g.label, chips };
        }),
      };
    }
    if (sec.type === "experience") {
      return { id: sec.id, type: "experience", label: LABELS.experience,
        items: sec.items.map((i) => buildItem(i, i.title || i.company, i.title ? i.company : "", dateRange(i.start, i.end))) };
    }
    if (sec.type === "projects") {
      return { id: sec.id, type: "projects", label: LABELS.projects,
        items: sec.items.map((i) => buildItem(i, i.name, i.subtitle ?? "", "")) };
    }
    if (sec.type === "education") {
      return { id: sec.id, type: "education", label: LABELS.education,
        items: sec.items.map((i) => ({ id: i.id, title: i.degree || i.school, subtitle: i.degree ? i.school : "", dates: dateRange(i.start, i.end), details: i.details })) };
    }
    return { id: sec.id, type: "other", label: sec.title, lines: sec.lines };
  });
}

/** Which suggestion ids touch which view node, so a click on any node can find its suggestion. */
export function suggestionForNode(view: SectionView[], nodeId: string): string | undefined {
  for (const s of view) {
    if (s.type === "summary" && s.node.id === nodeId) return s.node.suggestionId;
    if (s.type === "experience" || s.type === "projects") {
      for (const it of s.items) for (const b of it.bullets) if (b.id === nodeId) return b.suggestionId;
    }
  }
  return undefined;
}

/** Position of every node in reading order, so suggestions can be reviewed top to bottom no matter
 *  which section the model finished first. */
export function nodeOrder(resume: Resume): Map<string, number> {
  const order = new Map<string, number>();
  const add = (id: string) => order.set(id, order.size);
  for (const s of resume.sections) {
    add(s.id);
    if (s.type === "skills") for (const g of s.groups) add(g.id);
    if (s.type === "experience" || s.type === "projects") {
      for (const item of s.items) {
        add(item.id);
        for (const b of item.bullets) add(b.id);
      }
    }
  }
  return order;
}

export function sortSuggestions(resume: Resume | null, items: SuggestionOut[]): SuggestionOut[] {
  const order = resume ? nodeOrder(resume) : new Map<string, number>();
  const rank = (s: SuggestionOut) => order.get(s.target) ?? Number.MAX_SAFE_INTEGER;
  return [...items].sort((a, b) => rank(a) - rank(b) || a.seq - b.seq);
}
