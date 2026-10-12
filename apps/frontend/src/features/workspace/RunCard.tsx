"use client";

import { StitchLine, StitchRing, cn } from "@seam/ui";
import { Check, ChevronDown, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { Step, StepPart, StepState } from "./steps";

function StateIcon({ state, small = false }: { state: StepState; small?: boolean }) {
  const size = small ? "size-4" : "size-5";
  if (state === "running") return <StitchRing className={cn(size, "text-ink")} />;
  if (state === "done") {
    return (
      <span className={cn(size, "grid shrink-0 place-items-center rounded-full bg-ins text-ins-line")} aria-label="Done">
        <Check className={small ? "size-2.5" : "size-3"} strokeWidth={3} />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className={cn(size, "grid shrink-0 place-items-center rounded-full bg-del text-del-line")} aria-label="Stopped">
        <X className={small ? "size-2.5" : "size-3"} strokeWidth={3} />
      </span>
    );
  }
  return <span className={cn(size, "shrink-0 rounded-full border border-dashed border-line-strong")} aria-label="Waiting" />;
}

function Pill({ state }: { state: StepState }) {
  const copy = { pending: "Waiting", running: "Working", done: "Done", failed: "Stopped" }[state];
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium",
        state === "done" && "bg-ins text-ins-line",
        state === "failed" && "bg-del text-del-line",
        (state === "running" || state === "pending") && "bg-cream text-ink-soft",
      )}
    >
      {state === "done" && <Check className="size-3.5" strokeWidth={2.5} aria-hidden />}
      {state === "running" && <StitchRing className="size-3.5" label="" />}
      {copy}
    </span>
  );
}

function Row({ step, children, after }: { step: Step; children?: ReactNode; after?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const expandable = step.state === "done" && !!children;
  const head = (
    <>
      <StateIcon state={step.state} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[14px] font-medium", step.state === "pending" && "text-ink-muted")}>{step.title}</span>
        {/* the line is always there, so a step finishing never changes the card's height */}
        <span className="flex h-[18px] items-center gap-2 text-[12.5px] leading-[18px] text-ink-muted">
          {step.state === "running" && <StitchLine className="shrink-0 text-ink-soft" />}
          <span className="truncate">{step.summary ?? (step.state === "running" ? "Working on it…" : step.state === "failed" ? "Didn't finish" : "")}</span>
        </span>
      </span>
      {expandable && <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-ink-muted transition-transform duration-150", open && "rotate-180")} aria-hidden />}
    </>
  );
  return (
    <li>
      {expandable ? (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-start gap-3 rounded-[10px] px-2 py-1.5 text-left hover:bg-cream/60">
          {head}
        </button>
      ) : (
        <div className="flex items-start gap-3 px-2 py-1.5">{head}</div>
      )}
      {expandable && open && <div className="mt-1 mb-2 ml-10 border-l border-line pl-4">{children}</div>}
      {after}
    </li>
  );
}

function Parts({ parts, onJump, footer }: { parts: StepPart[]; onJump?: (section: string) => void; footer?: ReactNode }) {
  return (
    <div className="mb-1 ml-10">
    <ul className="space-y-0.5">
      {parts.map((p) => (
        <li key={p.key}>
          <button
            type="button"
            disabled={!onJump || p.count === 0}
            onClick={() => onJump?.(p.key)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left text-[13px] enabled:hover:bg-cream/60 disabled:cursor-default"
          >
            <StateIcon state={p.state} small />
            <span className={cn("flex-1", p.state === "pending" && "text-ink-muted")}>{p.label}</span>
            <span className="tabular text-ink-muted">{p.count > 0 ? p.count : p.state === "done" ? "No changes" : ""}</span>
          </button>
        </li>
      ))}
    </ul>
    {footer}
    </div>
  );
}

/** One card for the whole run: each step ticks off as the stream reports it, and a finished
 *  step opens to show what it found. */
export function RunCard({ steps, details, onJump, footer }: {
  steps: Step[];
  details: Partial<Record<Step["key"], ReactNode>>;
  onJump?: (section: string) => void;
  /** Sits under the list of sections once suggestions exist. */
  footer?: ReactNode;
}) {
  const overall: StepState = steps.some((s) => s.state === "failed")
    ? "failed"
    : steps.every((s) => s.state === "done")
      ? "done"
      : "running";
  return (
    <section aria-label="Tailoring progress" className="rounded-[18px] border border-line bg-bg">
      <header className="flex items-center justify-between gap-3 border-b border-line py-3 pr-3 pl-4">
        <h2 className="text-[15px] font-medium tracking-[-0.01em]">Tailoring your resume</h2>
        <Pill state={overall} />
      </header>
      <ol className="space-y-0.5 p-2" aria-live="polite">
        {steps.map((step) => (
          <Row
            key={step.key}
            step={step}
            after={step.parts && step.parts.length > 0 && step.state !== "pending" ? <Parts parts={step.parts} onJump={onJump} footer={footer} /> : null}
          >
            {details[step.key]}
          </Row>
        ))}
      </ol>
    </section>
  );
}
