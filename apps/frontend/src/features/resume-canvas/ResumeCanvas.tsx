"use client";

import type { Resume } from "@seam/api-client";
import { StitchLine, cn } from "@seam/ui";
import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";
import { InlineDiff } from "./InlineDiff";
import type { BulletView, NodeState, SectionView, SkillChip } from "./view-model";

interface CanvasProps {
  contact: Resume["contact"];
  view: SectionView[];
  /** The suggestion currently under review, if any. */
  cursor?: string | null;
  highlight?: ReadonlySet<string>;
  onSelect?: (suggestionId: string) => void;
  /** Section types that suggestions are still being written for. */
  busy?: ReadonlySet<string>;
}

const GUTTER: Record<NodeState, string> = {
  plain: "bg-transparent",
  changed: "bg-ins-line",
  inserted: "bg-ins-line",
  removed: "bg-del-line",
  moved: "bg-blue",
  settled: "bg-ins-line/35",
};

function Heading({ children, busy }: { children: ReactNode; busy: boolean }) {
  return (
    <h2 className="relative mt-5 mb-2 border-b border-ink/80 pb-0.5 text-[11.5px] font-semibold tracking-[0.08em] text-ink uppercase">
      {children}
      {/* sits in the heading's own line, so a section starting or finishing work moves nothing */}
      {busy && <StitchLine className="absolute right-0 bottom-1.5 w-14 text-[#100f0f]/60" />}
    </h2>
  );
}

interface NodeProps {
  node: BulletView;
  inList?: boolean;
  active: boolean;
  highlighted: boolean;
  onSelect?: (suggestionId: string) => void;
}

// Node and Chip live at module scope on purpose. Declared inside the canvas they would be new
// component types on every render, and React would unmount and rebuild every line each time
// anything in the review changed.
function Node({ node, inList = false, active, highlighted, onSelect }: NodeProps) {
  const primary = node.suggestionId ?? node.suggestionIds[0];
  const actionable = !!primary && !!onSelect;
  const flaggedPending = node.flagged && node.state !== "settled" && node.state !== "plain";
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
      // -mx/px give the hover and active backgrounds breathing room without moving the text
      className={cn(
        "relative -mx-1.5 rounded-[4px] px-1.5 py-0.5 transition-colors duration-150",
        actionable && "cursor-pointer hover:bg-cream/60",
        highlighted && "bg-yellow/25",
        active && "bg-cream/80 ring-1 ring-ink/25",
        node.state === "removed" && "text-ink-muted line-through decoration-del-line",
      )}
    >
      {/* change bar lives in the margin, clear of list markers, so text never shifts */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0.5 w-0.5 rounded-full transition-colors duration-150",
          inList ? "-left-[22px]" : "-left-4",
          flaggedPending ? "bg-yellow" : GUTTER[node.state],
        )}
      />
      {node.runs ? <InlineDiff runs={node.runs} /> : node.text}
      {node.state === "moved" && node.movedFrom && (
        <span className="ml-2 inline-block align-middle font-sans text-[10.5px] font-medium tracking-wide whitespace-nowrap text-ink-muted">↑ MOVED FROM {node.movedFrom}</span>
      )}
      {node.state === "inserted" && <span className="ml-2 inline-block align-middle font-sans text-[10.5px] font-medium tracking-wide whitespace-nowrap text-ins-line">NEW</span>}
    </div>
  );
}

function Chip({ chip, active, onSelect }: { chip: SkillChip; active: boolean; onSelect?: (suggestionId: string) => void }) {
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
        chip.state === "plain" && "border-transparent bg-cream/70",
        chip.state === "settled" && "border-ins-line/40 bg-ins",
        chip.state === "inserted" && (chip.flagged ? "border-dashed border-yellow bg-warn" : "border-dashed border-ins-line bg-ins"),
        chip.state === "removed" && "border-transparent bg-del line-through",
        active && "ring-2 ring-ink/40",
        actionable && "cursor-pointer",
      )}
    >
      {chip.state === "inserted" && "+ "}
      {chip.value}
    </button>
  );
}

/** The paper. Every node that carries a suggestion exposes `data-anchor`, so the workspace can
 *  scroll the one under review into view. Selecting a node never changes the layout. */
export function ResumeCanvas({ contact, view, cursor, highlight, onSelect, busy }: CanvasProps) {
  const isActive = (ids: string[]) => !!cursor && ids.includes(cursor);
  const node = (n: BulletView, inList = false) => (
    <Node
      node={n}
      inList={inList}
      active={isActive(n.suggestionIds)}
      highlighted={!!n.suggestionId && !!highlight?.has(n.suggestionId)}
      onSelect={onSelect}
    />
  );

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
            {sec.type === "summary" && node(sec.node)}

            {sec.type === "skills" && (
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

            {(sec.type === "experience" || sec.type === "projects") && (
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
                          // only items whose order can change animate, so unrelated height changes never slide
                          layout={item.reorderId ? "position" : false}
                          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                          className="list-disc marker:text-[#5b5853]"
                        >
                          {node(b, true)}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {sec.type === "education" && (
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

            {sec.type === "other" && (
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
