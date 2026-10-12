"use client";

import { type MatchScore, Verdict } from "@seam/api-client";
import { cn } from "@seam/ui";
import { Check, CircleDashed, CircleHelp, X } from "lucide-react";

const VERDICT = {
  [Verdict.Demonstrated]: { icon: Check, label: "Demonstrated", tone: "text-ins-line" },
  [Verdict.Listed]: { icon: CircleDashed, label: "Listed only", tone: "text-warn-ink" },
  [Verdict.Missing]: { icon: X, label: "Missing", tone: "text-del-line" },
  [Verdict.Unsure]: { icon: CircleHelp, label: "Unclear", tone: "text-ink-muted" },
} satisfies Record<Verdict, { icon: typeof Check; label: string; tone: string }>;

interface BreakdownProps {
  score: MatchScore;
  activeReq?: string | null;
  onPick?: (id: string | null) => void;
}

export function Breakdown({ score, activeReq, onPick }: BreakdownProps) {
  return (
    <ul className="space-y-0.5">
      {score.requirements.map((r) => {
        const v = VERDICT[r.verdict];
        const Icon = v.icon;
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onPick?.(activeReq === r.id ? null : r.id)}
              aria-pressed={activeReq === r.id}
              className={cn(
                "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-cream",
                activeReq === r.id && "bg-cream",
              )}
            >
              <Icon className={cn("mt-0.5 size-3.5 shrink-0", v.tone)} aria-label={v.label} />
              <span className="flex-1 leading-snug">{r.text}</span>
              {!r.must_have && (
                <span className="shrink-0 text-[10.5px] text-ink-muted uppercase">nice</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface KeywordListProps {
  matched: string[];
  missing: string[];
}

export function KeywordList({ matched, missing }: KeywordListProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {matched.map((k) => (
        <span
          key={k}
          className="inline-flex items-center gap-1 rounded-full bg-ins px-2.5 py-0.5 text-xs"
        >
          <Check className="size-3" />
          {k}
        </span>
      ))}
      {missing.map((k) => (
        <span
          key={k}
          className="rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-xs text-ink-muted"
          title="Not on your resume. Add it only if it's true."
        >
          {k}
        </span>
      ))}
    </div>
  );
}
