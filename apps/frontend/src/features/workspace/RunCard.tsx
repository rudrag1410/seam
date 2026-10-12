"use client";

import { StitchLine, StitchRing, cn } from "@seam/ui";
import type { SectionName } from "@seam/api-client";
import { Check, ChevronDown, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { type Step, StepKey, type StepPart, StepState } from "./steps";

const PILL_COPY: Record<StepState, string> = {
  [StepState.Pending]: "Waiting",
  [StepState.Running]: "Working",
  [StepState.Done]: "Done",
  [StepState.Failed]: "Stopped",
};

const PILL_TONE: Record<StepState, string> = {
  [StepState.Pending]: "bg-cream text-ink-soft",
  [StepState.Running]: "bg-cream text-ink-soft",
  [StepState.Done]: "bg-ins text-ins-line",
  [StepState.Failed]: "bg-del text-del-line",
};

const IDLE_LINE: Record<StepState, string> = {
  [StepState.Pending]: "",
  [StepState.Running]: "Working on it…",
  [StepState.Done]: "",
  [StepState.Failed]: "Didn't finish",
};

interface StateIconProps {
  state: StepState;
  small?: boolean;
}

function StateIcon({ state, small = false }: StateIconProps) {
  const size = small ? "size-4" : "size-5";
  const glyph = small ? "size-2.5" : "size-3";
  switch (state) {
    case StepState.Running:
      return <StitchRing className={cn(size, "text-ink")} />;
    case StepState.Done:
      return (
        <span className={cn(size, "grid shrink-0 place-items-center rounded-full bg-ins text-ins-line")} aria-label="Done">
          <Check className={glyph} strokeWidth={3} />
        </span>
      );
    case StepState.Failed:
      return (
        <span className={cn(size, "grid shrink-0 place-items-center rounded-full bg-del text-del-line")} aria-label="Stopped">
          <X className={glyph} strokeWidth={3} />
        </span>
      );
    default:
      return <span className={cn(size, "shrink-0 rounded-full border border-dashed border-line-strong")} aria-label="Waiting" />;
  }
}

interface PillProps {
  state: StepState;
}

function Pill({ state }: PillProps) {
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium", PILL_TONE[state])}>
      {state === StepState.Done && <Check className="size-3.5" strokeWidth={2.5} aria-hidden />}
      {state === StepState.Running && <StitchRing className="size-3.5" label="" />}
      {PILL_COPY[state]}
    </span>
  );
}

interface RowProps {
  step: Step;
  children?: ReactNode;
  after?: ReactNode;
}

function Row({ step, children, after }: RowProps) {
  const [open, setOpen] = useState(false);
  const expandable = step.state === StepState.Done && !!children;
  const head = (
    <>
      <StateIcon state={step.state} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[14px] font-medium", step.state === StepState.Pending && "text-ink-muted")}>{step.title}</span>
        <span className="flex h-[18px] items-center gap-2 text-[12.5px] leading-[18px] text-ink-muted">
          {step.state === StepState.Running && <StitchLine className="shrink-0 text-ink-soft" />}
          <span className="truncate">{step.summary ?? IDLE_LINE[step.state]}</span>
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

interface PartsProps {
  parts: StepPart[];
  onJump?: (section: SectionName) => void;
  footer?: ReactNode;
}

function Parts({ parts, onJump, footer }: PartsProps) {
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
              <span className={cn("flex-1", p.state === StepState.Pending && "text-ink-muted")}>{p.label}</span>
              <span className="tabular text-ink-muted">{p.count > 0 ? p.count : p.state === StepState.Done ? "No changes" : ""}</span>
            </button>
          </li>
        ))}
      </ul>
      {footer}
    </div>
  );
}

function overallState(steps: Step[]): StepState {
  if (steps.some((s) => s.state === StepState.Failed)) return StepState.Failed;
  return steps.every((s) => s.state === StepState.Done) ? StepState.Done : StepState.Running;
}

interface RunCardProps {
  steps: Step[];
  details: Partial<Record<StepKey, ReactNode>>;
  onJump?: (section: SectionName) => void;
  footer?: ReactNode;
}

export function RunCard({ steps, details, onJump, footer }: RunCardProps) {
  return (
    <section aria-label="Tailoring progress" className="rounded-[18px] border border-line bg-bg">
      <header className="flex items-center justify-between gap-3 border-b border-line py-3 pr-3 pl-4">
        <h2 className="text-[15px] font-medium tracking-[-0.01em]">Tailoring your resume</h2>
        <Pill state={overallState(steps)} />
      </header>
      <ol className="space-y-0.5 p-2" aria-live="polite">
        {steps.map((step) => (
          <Row
            key={step.key}
            step={step}
            after={step.parts && step.parts.length > 0 && step.state !== StepState.Pending ? <Parts parts={step.parts} onJump={onJump} footer={footer} /> : null}
          >
            {details[step.key]}
          </Row>
        ))}
      </ol>
    </section>
  );
}
