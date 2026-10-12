import { Decision, OpName, type Resume, SectionName, type SuggestionOut } from "@seam/api-client";
import { type DiffRun, wordDiff } from "@seam/resume-core";

/** Pure translation of (resume, suggestions, decisions) into what the canvas draws.
 *  Kept free of React so every review state can be unit-tested. */

/** Suggestions shows every change still in play; Clean shows exactly what finalizing would save;
 *  Original shows the resume as uploaded. */
export enum ViewMode {
  Suggestions = "suggestions",
  Clean = "clean",
  Original = "original",
}

/** How a line or chip is marked on the paper. */
export enum NodeState {
  Plain = "plain",
  Changed = "changed",
  Inserted = "inserted",
  Removed = "removed",
  Moved = "moved",
  Settled = "settled",
}

/** The kinds of section the paper draws. */
export enum SectionKind {
  Summary = "summary",
  Skills = "skills",
  Experience = "experience",
  Projects = "projects",
  Education = "education",
  Other = "other",
}

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

/** The paper's kind for each section a user can ask to have tailored. */
export const KIND_OF_SECTION: Record<SectionName, SectionKind> = {
  [SectionName.Summary]: SectionKind.Summary,
  [SectionName.Skills]: SectionKind.Skills,
  [SectionName.Experience]: SectionKind.Experience,
  [SectionName.Projects]: SectionKind.Projects,
};

export interface SkillGroupView {
  id: string;
  label: string;
  chips: SkillChip[];
}

export interface EducationView {
  id: string;
  title: string;
  subtitle: string;
  dates: string;
  details?: string | null;
}

export type SectionView =
  | { id: string; type: SectionKind.Summary; label: string; node: BulletView }
  | { id: string; type: SectionKind.Skills; label: string; groups: SkillGroupView[] }
  | { id: string; type: SectionKind.Experience | SectionKind.Projects; label: string; items: ItemView[] }
  | { id: string; type: SectionKind.Education; label: string; items: EducationView[] }
  | { id: string; type: SectionKind.Other; label: string; lines: string[] };

const LABELS: Record<Exclude<SectionKind, SectionKind.Other>, string> = {
  [SectionKind.Summary]: "Summary",
  [SectionKind.Skills]: "Skills",
  [SectionKind.Experience]: "Experience",
  [SectionKind.Projects]: "Projects",
  [SectionKind.Education]: "Education",
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Section = Resume["sections"][number];
type SkillsSection = Extract<Section, { type: "skills" }>;
type SkillGroup = SkillsSection["groups"][number];
type ExperienceItem = Extract<Section, { type: "experience" }>["items"][number];
type ProjectItem = Extract<Section, { type: "projects" }>["items"][number];
type EducationItem = Extract<Section, { type: "education" }>["items"][number];
type BulletOwner = { id: string; bullets: { id: string; text: string }[] };

/** What one pass over the resume needs to know: the view, and the suggestions that count in it. */
interface Scope {
  mode: ViewMode;
  active: SuggestionOut[];
  byTarget: Map<string, SuggestionOut[]>;
}

/** Suggestions shows everything still in play. Clean shows exactly what finalizing would save:
 *  the changes that have been accepted, with no review marks. Original shows none. */
function live(s: SuggestionOut, mode: ViewMode): boolean {
  if (mode === ViewMode.Suggestions) return s.status !== Decision.Rejected;
  return mode === ViewMode.Clean && (s.status === Decision.Accepted || s.status === Decision.Edited);
}

function scopeFor(suggestions: SuggestionOut[], mode: ViewMode): Scope {
  const active = suggestions.filter((s) => live(s, mode));
  const byTarget = new Map<string, SuggestionOut[]>();
  for (const s of active) byTarget.set(s.target, [...(byTarget.get(s.target) ?? []), s]);
  return { mode, active, byTarget };
}

function forTarget(scope: Scope, id: string, ...ops: string[]): SuggestionOut | undefined {
  return scope.byTarget.get(id)?.find((s) => ops.includes(s.op));
}

function ofKind(scope: Scope, op: string, target: string): SuggestionOut[] {
  return scope.active.filter((s) => s.op === op && s.target === target);
}

function after(s: SuggestionOut): string {
  return s.status === Decision.Edited && s.edited_text ? s.edited_text : String((s.payload as { after?: string }).after ?? "");
}

function skillValue(s: SuggestionOut): string {
  return s.status === Decision.Edited && s.edited_text ? s.edited_text : String((s.payload as { value: string }).value);
}

/** How something added shows up: unmarked in Clean, otherwise as new until it has been decided. */
function addedState(scope: Scope, s: SuggestionOut): NodeState {
  if (scope.mode === ViewMode.Clean) return NodeState.Plain;
  return s.status === Decision.Pending ? NodeState.Inserted : NodeState.Settled;
}

function formatDate(value?: string | null): string {
  if (!value) return "";
  if (/^(present|current|now)$/i.test(value)) return "Present";
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : value;
}

function dateRange(start?: string | null, end?: string | null): string {
  return [formatDate(start), formatDate(end)].filter(Boolean).join(" – ");
}

/** A line of text, with whichever of the given kinds of rewrite applies to it. */
function textNode(scope: Scope, id: string, original: string, ...ops: string[]): BulletView {
  const s = forTarget(scope, id, ...ops);
  if (!s) return { id, text: original, runs: null, state: NodeState.Plain, suggestionIds: [], flagged: false };
  const base = { id, suggestionId: s.id, suggestionIds: [s.id], flagged: s.requires_confirmation };
  if (s.status === Decision.Pending && scope.mode === ViewMode.Suggestions) {
    return { ...base, text: after(s), runs: wordDiff(original, after(s)), state: NodeState.Changed };
  }
  return { ...base, text: after(s), runs: null, state: s.status === Decision.Pending || scope.mode === ViewMode.Clean ? NodeState.Plain : NodeState.Settled };
}

/** The item's bullet ids in display order: the reorder's order first, anything it left out after. */
function bulletOrder(item: BulletOwner, reorder: SuggestionOut | undefined): string[] {
  const ids = item.bullets.map((b) => b.id);
  if (!reorder) return ids;
  const order = (reorder.payload as { order?: string[] }).order ?? [];
  const listed = new Set(order);
  return [...order.filter((id) => ids.includes(id)), ...ids.filter((id) => !listed.has(id))];
}

/** One existing bullet, or null when an accepted removal has taken it out. */
function bulletView(scope: Scope, item: BulletOwner, id: string, position: number, reorder: SuggestionOut | undefined): BulletView | null {
  const original = item.bullets.find((b) => b.id === id)!.text;
  const removal = forTarget(scope, id, OpName.RemoveBullet);
  if (removal && removal.status !== Decision.Pending) return null;
  const view: BulletView = removal
    ? { ...textNode(scope, id, original), state: NodeState.Removed, suggestionId: removal.id, suggestionIds: [removal.id] }
    : textNode(scope, id, original, OpName.ReplaceText);
  const from = item.bullets.findIndex((b) => b.id === id);
  if (reorder && from !== position && scope.mode === ViewMode.Suggestions) {
    view.suggestionIds = [...view.suggestionIds, reorder.id];
    if (view.state === NodeState.Plain) view.state = NodeState.Moved;
    view.movedFrom = from + 1;
  }
  return view;
}

function insertedBullet(scope: Scope, s: SuggestionOut): BulletView {
  return {
    id: (s.payload as { new_id: string }).new_id, text: after(s), runs: null, flagged: s.requires_confirmation,
    state: addedState(scope, s), suggestionId: s.id, suggestionIds: [s.id],
  };
}

function itemView(scope: Scope, item: BulletOwner, title: string, subtitle: string, dates: string): ItemView {
  const reorder = forTarget(scope, item.id, OpName.Reorder);
  const bullets: BulletView[] = [];
  for (const [position, id] of bulletOrder(item, reorder).entries()) {
    const view = bulletView(scope, item, id, position, reorder);
    if (view) bullets.push(view);
  }
  for (const s of ofKind(scope, OpName.InsertBullet, item.id)) bullets.push(insertedBullet(scope, s));
  return {
    id: item.id, title, subtitle, dates, bullets,
    reorderId: scope.mode === ViewMode.Suggestions ? reorder?.id : undefined, reorderPending: reorder?.status === Decision.Pending,
  };
}

function experienceItem(scope: Scope, i: ExperienceItem): ItemView {
  return itemView(scope, i, i.title || i.company, i.title ? i.company : "", dateRange(i.start, i.end));
}

function projectItem(scope: Scope, i: ProjectItem): ItemView {
  return itemView(scope, i, i.name, i.subtitle ?? "", "");
}

function educationItem(i: EducationItem): EducationView {
  return { id: i.id, title: i.degree || i.school, subtitle: i.degree ? i.school : "", dates: dateRange(i.start, i.end), details: i.details };
}

function skillGroup(scope: Scope, group: SkillGroup): SkillGroupView {
  const chips: SkillChip[] = [];
  const removed = new Map<string, SuggestionOut>();
  for (const s of ofKind(scope, OpName.RemoveSkill, group.id)) removed.set(skillValue(s).toLowerCase(), s);
  for (const item of group.items) {
    const removal = removed.get(item.toLowerCase());
    if (removal && removal.status !== Decision.Pending) continue;
    chips.push({ key: item, value: item, state: removal ? NodeState.Removed : NodeState.Plain, suggestionId: removal?.id, flagged: false });
  }
  for (const s of ofKind(scope, OpName.AddSkill, group.id)) {
    const value = skillValue(s);
    if (group.items.some((i) => i.toLowerCase() === value.toLowerCase())) continue;
    chips.push({ key: `add:${s.id}`, value, flagged: s.requires_confirmation, suggestionId: s.id, state: addedState(scope, s) });
  }
  return { id: group.id, label: group.label, chips };
}

/** The paper's section for one resume section. The API tags its sections with plain literals so that
 *  this switch narrows them; the paper's own view uses `SectionKind`. */
function sectionView(scope: Scope, sec: Section): SectionView {
  switch (sec.type) {
    case "summary":
      return { id: sec.id, type: SectionKind.Summary, label: LABELS[SectionKind.Summary], node: textNode(scope, sec.id, sec.text, OpName.RewriteSummary, OpName.ReplaceText) };
    case "skills":
      return { id: sec.id, type: SectionKind.Skills, label: LABELS[SectionKind.Skills], groups: sec.groups.map((g) => skillGroup(scope, g)) };
    case "experience":
      return { id: sec.id, type: SectionKind.Experience, label: LABELS[SectionKind.Experience], items: sec.items.map((i) => experienceItem(scope, i)) };
    case "projects":
      return { id: sec.id, type: SectionKind.Projects, label: LABELS[SectionKind.Projects], items: sec.items.map((i) => projectItem(scope, i)) };
    case "education":
      return { id: sec.id, type: SectionKind.Education, label: LABELS[SectionKind.Education], items: sec.items.map(educationItem) };
    default:
      return { id: sec.id, type: SectionKind.Other, label: sec.title, lines: sec.lines };
  }
}

export function buildView(resume: Resume, suggestions: SuggestionOut[], mode: ViewMode): SectionView[] {
  const scope = scopeFor(suggestions, mode);
  return resume.sections.map((sec) => sectionView(scope, sec));
}

/** The ids of everything a suggestion can target, in reading order. */
function nodeIds(resume: Resume): string[] {
  const ids: string[] = [];
  for (const s of resume.sections) {
    ids.push(s.id);
    if (s.type === "skills") for (const g of s.groups) ids.push(g.id);
    if (s.type === "experience" || s.type === "projects") {
      for (const item of s.items) {
        ids.push(item.id);
        for (const b of item.bullets) ids.push(b.id);
      }
    }
  }
  return ids;
}

/** Position of every node in reading order, so suggestions can be reviewed top to bottom no matter
 *  which section the model finished first. */
export function nodeOrder(resume: Resume): Map<string, number> {
  return new Map(nodeIds(resume).map((id, position) => [id, position]));
}

function rank(order: Map<string, number>, s: SuggestionOut): number {
  return order.get(s.target) ?? Number.MAX_SAFE_INTEGER;
}

export function sortSuggestions(resume: Resume | null, items: SuggestionOut[]): SuggestionOut[] {
  const order = resume ? nodeOrder(resume) : new Map<string, number>();
  return [...items].sort((a, b) => rank(order, a) - rank(order, b) || a.seq - b.seq);
}
