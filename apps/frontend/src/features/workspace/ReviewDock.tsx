"use client";

import { Decision, OpName, type SuggestionOut } from "@seam/api-client";
import { Badge, Button, Kbd, Textarea, cn } from "@seam/ui";
import { Check, ChevronLeft, ChevronRight, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { decide, move } from "../review/actions";
import { useReview } from "../review/store";
import { SECTION_LABEL } from "./steps";

const OP_LABEL: Record<OpName, string> = {
  [OpName.ReplaceText]: "Rephrase",
  [OpName.RewriteSummary]: "Rewrite summary",
  [OpName.Reorder]: "Reorder bullets",
  [OpName.InsertBullet]: "New bullet",
  [OpName.RemoveBullet]: "Remove bullet",
  [OpName.AddSkill]: "Add skill",
  [OpName.RemoveSkill]: "Remove skill",
};
const DECIDED: Record<Decision, string> = {
  [Decision.Pending]: "Pending",
  [Decision.Accepted]: "Accepted",
  [Decision.Edited]: "Edited",
  [Decision.Rejected]: "Rejected",
};

const canEdit = (s: SuggestionOut) => s.op !== OpName.Reorder && s.op !== OpName.RemoveBullet;
export const canReword = (s: SuggestionOut) =>
  s.op !== OpName.Reorder && s.op !== OpName.AddSkill && s.op !== OpName.RemoveSkill;

function startEdit(id: string): void {
  useReview.setState({ editing: id });
}

function cancelEdit(): void {
  useReview.setState({ editing: null });
}

function saveEdit(id: string, text: string): void {
  if (text.trim()) decide(id, Decision.Edited, text.trim());
}

function suggestedText(s: SuggestionOut): string {
  const p = s.payload as { after?: string; value?: string };
  return s.edited_text || p.after || p.value || "";
}

interface StepperProps {
  index: number;
  total: number;
}

function Stepper({ index, total }: StepperProps) {
  const arrow =
    "grid size-7 place-items-center rounded-full border border-line text-ink-soft hover:border-line-strong hover:text-ink disabled:opacity-40";
  return (
    <div className="flex items-center gap-1.5">
      <span className="tabular mr-1 text-[12px] text-ink-muted">
        {index + 1} of {total}
      </span>
      <button
        type="button"
        aria-label="Previous suggestion (K)"
        title="Previous (K)"
        disabled={total < 2}
        onClick={() => move(-1)}
        className={arrow}
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Next suggestion (J)"
        title="Next (J)"
        disabled={total < 2}
        onClick={() => move(1)}
        className={arrow}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

interface EditBoxProps {
  suggestion: SuggestionOut;
}

function EditBox({ suggestion: s }: EditBoxProps) {
  const [text, setText] = useState(suggestedText(s));
  return (
    <div className="mt-3">
      <Textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        aria-label="Edit suggestion"
        className="min-h-0 px-3 text-[13.5px]"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            saveEdit(s.id, text);
          }
          if (e.key === "Escape") cancelEdit();
        }}
      />
      <div className="mt-2.5 flex items-center gap-2">
        <Button size="sm" onClick={() => saveEdit(s.id, text)}>
          Save edit{" "}
          <Kbd className="hidden border-transparent bg-white/15 text-inherit sm:inline-flex">
            ⌘↵
          </Kbd>
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelEdit}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function ReviewDock() {
  const cursor = useReview((st) => st.cursor);
  const suggestions = useReview((st) => st.suggestions);
  const editing = useReview((st) => st.editing);
  const confirming = useReview((st) => st.confirming);
  const jd = useReview((st) => st.jd);

  const index = suggestions.findIndex((x) => x.id === cursor);
  const s = suggestions[index];

  useEffect(() => {
    if (editing) document.getElementById("review-dock")?.scrollIntoView({ block: "nearest" });
  }, [editing]);

  if (!s) return null;

  const reqs = (s.addresses ?? []).flatMap((id) => {
    const r = jd?.must_haves.find((x) => x.id === id) ?? jd?.nice_to_haves.find((x) => x.id === id);
    return r ? [r.text] : [];
  });
  const decided = s.status !== Decision.Pending;
  const unsure = (s.checks as { band?: string } | null)?.band === "medium";
  const isConfirming = confirming === s.id;

  return (
    <section
      id="review-dock"
      aria-label="Suggestion under review"
      className="rounded-[18px] border border-line bg-bg p-3.5 text-[13px]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{OP_LABEL[s.op]}</span>
          <span className="text-ink-muted">in {SECTION_LABEL[s.section]}</span>
          {s.score_delta != null && s.score_delta > 0 && (
            <Badge tone="green" className="tabular">
              +{s.score_delta.toFixed(1)} match
            </Badge>
          )}
          {unsure && <Badge tone="yellow">Check this</Badge>}
          {decided && (
            <Badge tone={s.status === Decision.Rejected ? "orange" : "ink"}>
              {DECIDED[s.status]}
            </Badge>
          )}
        </div>
        <Stepper index={index} total={suggestions.length} />
      </div>

      {editing === s.id ? (
        <EditBox key={s.id} suggestion={s} />
      ) : (
        <>
          {suggestedText(s) && (
            <p className="mt-2 line-clamp-4 rounded-[10px] bg-ins px-3 py-2 leading-relaxed lg:hidden">
              {suggestedText(s)}
            </p>
          )}
          {s.rationale && <p className="mt-2 leading-relaxed text-ink-soft">{s.rationale}</p>}
          {reqs.length > 0 && (
            <p className="mt-2 line-clamp-2 hidden text-[12px] leading-snug sm:[display:-webkit-box]">
              <span className="text-ink-muted">Addresses: </span>
              <span className="text-ink-soft">{reqs[0]}</span>
              {reqs.length > 1 && (
                <span className="text-ink-muted"> (+{reqs.length - 1} more)</span>
              )}
            </p>
          )}
          {s.requires_confirmation && (
            <p className="mt-2.5 rounded-[10px] bg-warn px-3 py-2 text-warn-ink">
              <strong className="font-medium">Only accept if true.</strong> {s.flag_reason}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {decided ? (
              <Button size="sm" variant="secondary" onClick={() => decide(s.id, Decision.Pending)}>
                Undo decision
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => decide(s.id, Decision.Rejected)}
                >
                  <X className="size-3.5" /> Reject <Kbd className="hidden sm:inline-flex">R</Kbd>
                </Button>
                <Button
                  size="sm"
                  onClick={() => decide(s.id, Decision.Accepted)}
                  className={cn(isConfirming && "bg-ins-line text-bg")}
                >
                  <Check className="size-3.5" />
                  {isConfirming ? "Yes, this is true" : "Accept"}
                  {!isConfirming && (
                    <Kbd className="hidden border-transparent bg-white/15 text-inherit sm:inline-flex">
                      A
                    </Kbd>
                  )}
                </Button>
              </>
            )}
            {canEdit(s) && (
              <Button size="sm" variant="ghost" onClick={() => startEdit(s.id)}>
                <Pencil className="size-3.5" /> Edit <Kbd className="hidden sm:inline-flex">E</Kbd>
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
