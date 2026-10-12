"use client";

import { cn } from "@seam/ui";
import { ArrowUp, Loader2 } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { MAX_JD_CHARS, MIN_JD_CHARS, jdProblem } from "../jd/limits";
import type { SectionName } from "@seam/api-client";
import { SectionChips } from "../jd/ScopePicker";

export interface JobDraft {
  text: string;
  sections: SectionName[];
}

function jobReady(d: JobDraft): boolean {
  const n = d.text.trim().length;
  return n >= MIN_JD_CHARS && n <= MAX_JD_CHARS && d.sections.length > 0;
}

interface JobComposerProps {
  draft: JobDraft;
  onChange: (patch: Partial<JobDraft>) => void;
  onSend: () => void;
  sending: boolean;
  disabledReason?: string;
  error?: string | null;
}

export function JobComposer({
  draft,
  onChange,
  onSend,
  sending,
  disabledReason,
  error,
}: JobComposerProps) {
  const area = useRef<HTMLTextAreaElement>(null);
  const n = draft.text.trim().length;
  const problem = jdProblem(n);
  const canSend = jobReady(draft) && !disabledReason && !sending;

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [draft.text]);

  const hint =
    error ??
    disabledReason ??
    (draft.sections.length === 0 ? "Pick at least one section to tailor." : problem);

  return (
    <div>
      <div
        className={cn(
          "rounded-[22px] border border-line-strong bg-bg transition-colors focus-within:border-ink",
          error && "border-del-line",
        )}
      >
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
          className="scroll-thin block w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] leading-relaxed outline-none placeholder:text-ink-muted"
        />
        <div className="flex items-end gap-2 border-t border-line p-2 pl-3">
          <div className="min-w-0 flex-1 py-0.5">
            <SectionChips
              sections={draft.sections}
              onChange={(sections) => onChange({ sections })}
            />
          </div>
          {n > 0 && (
            <span
              className={cn(
                "tabular mr-1 hidden shrink-0 text-[12px] text-ink-muted sm:inline",
                n > MAX_JD_CHARS && "inline text-del-line",
              )}
            >
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
      <p
        role={error ? "alert" : undefined}
        className={cn(
          "mt-2 h-5 truncate px-2 text-[12.5px] text-ink-muted",
          (error || n > MAX_JD_CHARS) && "text-del-line",
        )}
      >
        {hint ?? "Nothing runs until you send it."}
      </p>
    </div>
  );
}
