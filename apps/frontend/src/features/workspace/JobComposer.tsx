"use client";

import { Popover, PopoverContent, PopoverTrigger, cn } from "@seam/ui";
import { ArrowUp, Link2, Loader2, SlidersHorizontal, Type } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { MAX_JD_CHARS, MIN_JD_CHARS, jdProblem } from "../jd/limits";
import type { Intensity, SectionName } from "@seam/api-client";
import { INTENSITY_LABEL, ScopePicker } from "../jd/ScopePicker";

export interface JobDraft {
  text: string;
  url: string;
  byUrl: boolean;
  sections: SectionName[];
  intensity: Intensity;
}

const tool = "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] text-ink-soft transition-colors hover:bg-cream hover:text-ink";
const toolShrink = "inline-flex h-8 min-w-0 items-center gap-1.5 rounded-full px-3 text-[13px] text-ink-soft transition-colors hover:bg-cream hover:text-ink";

function jobReady(d: JobDraft): boolean {
  const n = d.text.trim().length;
  const job = d.byUrl ? /^https?:\/\/\S+\.\S+/.test(d.url.trim()) : n >= MIN_JD_CHARS && n <= MAX_JD_CHARS;
  return job && d.sections.length > 0;
}

interface JobComposerProps {
  draft: JobDraft;
  onChange: (patch: Partial<JobDraft>) => void;
  onSend: () => void;
  sending: boolean;
  disabledReason?: string;
  error?: string | null;
}

export function JobComposer({ draft, onChange, onSend, sending, disabledReason, error }: JobComposerProps) {
  const area = useRef<HTMLTextAreaElement>(null);
  const n = draft.text.trim().length;
  const problem = draft.byUrl ? null : jdProblem(n);
  const canSend = jobReady(draft) && !disabledReason && !sending;

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [draft.text, draft.byUrl]);

  const hint = error ?? disabledReason ?? (draft.sections.length === 0 ? "Pick at least one section to tailor." : problem);

  return (
    <div>
      <div className={cn("rounded-[22px] border border-line-strong bg-bg transition-colors focus-within:border-ink", error && "border-del-line")}>
        {draft.byUrl ? (
          <input
            type="url"
            autoFocus
            value={draft.url}
            onChange={(e) => onChange({ url: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && canSend && onSend()}
            placeholder="https://company.com/careers/senior-engineer"
            aria-label="Link to the job posting"
            className="h-[52px] w-full bg-transparent px-5 text-[15px] outline-none placeholder:text-ink-muted"
          />
        ) : (
          <textarea
            ref={area}
            rows={2}
            value={draft.text}
            onChange={(e) => onChange({ text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
            placeholder="Paste the job description…"
            aria-label="Job description"
            aria-invalid={!!error || n > MAX_JD_CHARS}
            className="scroll-thin block w-full resize-none bg-transparent px-5 pt-4 pb-1 text-[15px] leading-relaxed outline-none placeholder:text-ink-muted"
          />
        )}
        <div className="flex items-center gap-1 p-1.5">
          <button type="button" onClick={() => onChange({ byUrl: !draft.byUrl })} className={tool}>
            {draft.byUrl ? <Type className="size-3.5" aria-hidden /> : <Link2 className="size-3.5" aria-hidden />}
            {draft.byUrl ? "Paste text" : "Use a link"}
          </button>
          <Popover>
            <PopoverTrigger className={toolShrink} aria-label="What to tailor">
              <SlidersHorizontal className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{draft.sections.length} {draft.sections.length === 1 ? "section" : "sections"} · {INTENSITY_LABEL[draft.intensity]}</span>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-[min(420px,calc(100vw-32px))] p-5">
              <ScopePicker
                sections={draft.sections}
                onSections={(sections) => onChange({ sections })}
                intensity={draft.intensity}
                onIntensity={(intensity) => onChange({ intensity })}
              />
            </PopoverContent>
          </Popover>
          <span className="min-w-0 flex-1" />
          {!draft.byUrl && n > 0 && (
            <span className={cn("tabular mr-1 hidden shrink-0 text-[12px] text-ink-muted sm:inline", n > MAX_JD_CHARS && "inline text-del-line")}>
              {n.toLocaleString()} / {MAX_JD_CHARS.toLocaleString()}
            </span>
          )}
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            aria-label="Tailor my resume"
            title="Tailor my resume (⌘↵)"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-on-ink transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </button>
        </div>
      </div>
      <p role={error ? "alert" : undefined} className={cn("mt-2 h-5 truncate px-2 text-[12.5px] text-ink-muted", (error || n > MAX_JD_CHARS) && "text-del-line")}>
        {hint ?? "Nothing runs until you send it."}
      </p>
    </div>
  );
}
