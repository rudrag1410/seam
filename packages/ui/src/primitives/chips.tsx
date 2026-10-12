"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "../cn";

const MAX_TAG_LENGTH = 40;

function sameTag(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function addTags(tags: string[], raw: string, max: number, known: string[]): string[] {
  const next = [...tags];
  for (const part of raw.split(/[,\n]/)) {
    const text = part.trim().slice(0, MAX_TAG_LENGTH);
    if (!text || next.length >= max || next.some((t) => sameTag(t, text))) continue;
    next.push(known.find((k) => sameTag(k, text)) ?? text);
  }
  return next;
}

interface TagInputProps {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  max?: number;
  id?: string;
}

export function TagInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
  max = 20,
  id,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const full = value.length >= max;
  const remaining = full
    ? []
    : suggestions.filter((s) => !value.some((v) => sameTag(v, s))).slice(0, 8);

  return (
    <div>
      <div className="flex max-h-44 min-h-11 flex-wrap items-center gap-1.5 overflow-y-auto rounded-[12px] border border-line-strong bg-bg px-2.5 py-1.5 focus-within:border-ink">
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-cream py-1 pr-1.5 pl-3 text-[13px]"
          >
            <span className="truncate">{v}</span>
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              className="grid size-4 shrink-0 place-items-center rounded-full hover:bg-line"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          maxLength={MAX_TAG_LENGTH}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              onChange(addTags(value, draft, max, suggestions));
              setDraft("");
            } else if (e.key === "Backspace" && !draft && value.length)
              onChange(value.slice(0, -1));
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (!/[,\n]/.test(text)) return;
            e.preventDefault();
            onChange(addTags(value, `${draft},${text}`, max, suggestions));
            setDraft("");
          }}
          onBlur={() => {
            onChange(addTags(value, draft, max, suggestions));
            setDraft("");
          }}
          placeholder={value.length ? "" : placeholder}
          className="min-w-24 flex-1 bg-transparent px-1.5 py-1 text-[15px] outline-none placeholder:text-ink-muted disabled:cursor-not-allowed"
        />
      </div>
      {(remaining.length > 0 || value.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(addTags(value, s, max, suggestions))}
              className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-muted hover:border-ink hover:text-ink"
            >
              + {s}
            </button>
          ))}
          {value.length > 0 && (
            <span className="ml-auto flex items-center gap-3 text-xs text-ink-muted">
              <span aria-live="polite">
                {full ? `Limit of ${max} reached` : `${value.length}/${max}`}
              </span>
              {value.length > 2 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="underline-offset-2 hover:text-ink hover:underline"
                >
                  Clear all
                </button>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface ChipSelectProps<T extends string> {
  value: T[];
  onChange: (v: T[]) => void;
  options: { value: T; label: string }[];
  single?: boolean;
}

export function ChipSelect<T extends string>({
  value,
  onChange,
  options,
  single = false,
}: ChipSelectProps<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(
                single
                  ? on
                    ? []
                    : [o.value]
                  : on
                    ? value.filter((v) => v !== o.value)
                    : [...value, o.value],
              )
            }
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              on
                ? "border-ink bg-ink text-on-ink"
                : "border-line-strong text-ink-soft hover:border-ink hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
