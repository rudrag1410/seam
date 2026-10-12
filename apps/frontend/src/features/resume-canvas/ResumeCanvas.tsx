"use client";

import type { Resume } from "@seam/api-client";
import { StitchLine, cn } from "@seam/ui";
import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";
import { InlineDiff } from "./InlineDiff";
import { type BulletView, NodeState, SectionKind, type SectionView, type SkillChip } from "./view-model";

interface CanvasProps {
  contact: Resume["contact"];
  view: SectionView[];
  cursor?: string | null;
  highlight?: ReadonlySet<string>;
  onSelect?: (suggestionId: string) => void;
  busy?: ReadonlySet<SectionKind>;
}

const GUTTER: Record<NodeState, string> = {
  [NodeState.Plain]: "bg-transparent",
  [NodeState.Changed]: "bg-ins-line",
  [NodeState.Inserted]: "bg-ins-line",
  [NodeState.Removed]: "bg-del-line",
  [NodeState.Moved]: "bg-blue",
  [NodeState.Settled]: "bg-ins-line/35",
};

interface HeadingProps {
  children: ReactNode;
  busy: boolean;
}

function Heading({ children, busy }: HeadingProps) {
  return (
    <h2 className="relative mt-5 mb-2 border-b border-ink/80 pb-0.5 text-[11.5px] font-semibold tracking-[0.08em] text-ink uppercase">
      {children}
      {busy && <StitchLine className="absolute right-0 bottom-1.5 w-14 text-[#100f0f]/60" />}
    </h2>
  );
}

interface NodeProps {
  node: BulletView;
  inList?: boolean;
  cursor?: string | null;
  highlight?: ReadonlySet<string>;
  onSelect?: (suggestionId: string) => void;
}

function Node({ node, inList = false, cursor, highlight, onSelect }: NodeProps) {
  const primary = node.suggestionId ?? node.suggestionIds[0];
  const active = !!cursor && node.suggestionIds.includes(cursor);
  const highlighted = !!node.suggestionId && !!highlight?.has(node.suggestionId);
  const actionable = !!primary && !!onSelect;
  const flaggedPending = node.flagged && node.state !== NodeState.Settled && node.state !== NodeState.Plain;
  return (
    <div
      role={actionable ? "button" : undefined}
      tabIndex={actionable ? 0 : undefined}
      data-anchor={node.suggestionId}
      aria-label={actionable ? "Review this change" : undefined}
      aria-current={active || undefined}
      onClick={() => actionable && onSelect(primary)}
      onKeyDown={(e) => {
        if (actionable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect(primary);
        }
      }}
      className={cn(
        "relative -mx-1.5 rounded-[4px] px-1.5 py-0.5 transition-colors duration-150",
        actionable && "cursor-pointer hover:bg-cream/60",
        highlighted && "bg-yellow/25",
        active && "bg-cream/80 ring-1 ring-ink/25",
        node.state === NodeState.Removed && "text-ink-muted line-through decoration-del-line",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0.5 w-0.5 rounded-full transition-colors duration-150",
          inList ? "-left-[22px]" : "-left-4",
          flaggedPending ? "bg-yellow" : GUTTER[node.state],
        )}
      />
      {node.runs ? <InlineDiff runs={node.runs} /> : node.text}
      {node.state === NodeState.Moved && node.movedFrom && (
        <span className="ml-2 inline-block align-middle font-sans text-[10.5px] font-medium tracking-wide whitespace-nowrap text-ink-muted">↑ MOVED FROM {node.movedFrom}</span>
      )}
      {node.state === NodeState.Inserted && <span className="ml-2 inline-block align-middle font-sans text-[10.5px] font-medium tracking-wide whitespace-nowrap text-ins-line">NEW</span>}
    </div>
  );
}

interface ChipProps {
  chip: SkillChip;
  active: boolean;
  onSelect?: (suggestionId: string) => void;
}

function Chip({ chip, active, onSelect }: ChipProps) {
  const actionable = !!chip.suggestionId && !!onSelect;
  return (
    <button
      type="button"
      disabled={!actionable}
      data-anchor={chip.suggestionId}
      aria-current={active || undefined}
      onClick={() => actionable && onSelect(chip.suggestionId!)}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[12.5px] leading-5 transition-colors",
        chip.state === NodeState.Plain && "border-transparent bg-cream/70",
        chip.state === NodeState.Settled && "border-ins-line/40 bg-ins",
        chip.state === NodeState.Inserted && (chip.flagged ? "border-dashed border-yellow bg-warn" : "border-dashed border-ins-line bg-ins"),
        chip.state === NodeState.Removed && "border-transparent bg-del line-through",
        active && "ring-2 ring-ink/40",
        actionable && "cursor-pointer",
      )}
    >
      {chip.state === NodeState.Inserted && "+ "}
      {chip.value}
    </button>
  );
}

export function ResumeCanvas({ contact, view, cursor, highlight, onSelect, busy }: CanvasProps) {
  return (
    <MotionConfig reducedMotion="user">
      <article
        aria-label="Resume"
        className="mx-auto w-full max-w-[794px] bg-white px-6 py-8 font-serif text-[13.5px] leading-[1.5] text-[#100f0f] shadow-[0_0_0_1px_var(--line),0_18px_40px_-24px_rgba(16,15,15,0.25)] sm:px-14 sm:py-12 [&>section:first-of-type>h2]:mt-0"
        style={{ colorScheme: "light", ["--ink" as string]: "#100f0f" }}
      >
        <header className="mb-5 text-center">
          <h1 className="font-serif text-[26px] leading-tight font-medium tracking-[-0.01em]">{contact.name}</h1>
          <p className="mt-1 text-[12px] text-[#5b5853]">
            {[contact.email, contact.phone, contact.location, ...contact.links].filter(Boolean).join("  |  ")}
          </p>
        </header>

        {view.map((sec) => (
          <section key={sec.id} aria-label={sec.label}>
            <Heading busy={!!busy?.has(sec.type)}>{sec.label}</Heading>
            {sec.type === SectionKind.Summary && <Node node={sec.node} cursor={cursor} highlight={highlight} onSelect={onSelect} />}

            {sec.type === SectionKind.Skills && (
              <div className="space-y-2">
                {sec.groups.map((g) => (
                  <div key={g.id} className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <span className="font-semibold">{g.label}:</span>
                    {g.chips.map((c) => (
                      <Chip key={c.key} chip={c} active={!!c.suggestionId && cursor === c.suggestionId} onSelect={onSelect} />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {(sec.type === SectionKind.Experience || sec.type === SectionKind.Projects) && (
              <div className="space-y-4">
                {sec.items.map((item) => (
                  <div key={item.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <p>
                        <span className="font-semibold">{item.title}</span>
                        {item.subtitle && <span> — {item.subtitle}</span>}
                      </p>
                      {item.dates && <span className="text-[12px] text-[#5b5853] tabular">{item.dates}</span>}
                    </div>
                    {item.reorderId && (
                      <button
                        type="button"
                        data-anchor={item.reorderId}
                        disabled={!onSelect}
                        onClick={() => onSelect?.(item.reorderId!)}
                        className={cn(
                          "mt-1 inline-flex h-5 items-center rounded-full bg-cream px-2.5 font-sans text-[11px] font-medium text-[#100f0f] enabled:hover:bg-line",
                          cursor === item.reorderId && "ring-2 ring-ink/30",
                          !item.reorderPending && "opacity-60",
                        )}
                      >
                        ↕ Reordered by relevance
                      </button>
                    )}
                    <ul className="mt-1.5 space-y-1 pl-4">
                      {item.bullets.map((b) => (
                        <motion.li
                          key={b.id}
                          layout={item.reorderId ? "position" : false}
                          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                          className="list-disc marker:text-[#5b5853]"
                        >
                          <Node node={b} inList cursor={cursor} highlight={highlight} onSelect={onSelect} />
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {sec.type === SectionKind.Education && (
              <div className="space-y-1.5">
                {sec.items.map((i) => (
                  <div key={i.id} className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p>
                      <span className="font-semibold">{i.title}</span>
                      {i.subtitle && <span> — {i.subtitle}</span>}
                      {i.details && <span className="text-[#5b5853]"> · {i.details}</span>}
                    </p>
                    {i.dates && <span className="text-[12px] text-[#5b5853] tabular">{i.dates}</span>}
                  </div>
                ))}
              </div>
            )}

            {sec.type === SectionKind.Other && (
              <ul className="space-y-1">
                {sec.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>
    </MotionConfig>
  );
}
