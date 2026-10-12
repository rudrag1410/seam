"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "../cn";

function withTag(tags: string[], raw: string): string[] {
  const tag = raw.trim().replace(/,$/, "");
  return tag && !tags.some((x) => x.toLowerCase() === tag.toLowerCase()) ? [...tags, tag] : tags;
}

interface TagInputProps {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  id?: string;
}

export function TagInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
  id,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const remaining = suggestions.filter((s) => !value.includes(s)).slice(0, 6);

  return (
    <div>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-[12px] border border-line-strong bg-bg px-2.5 py-1.5 focus-within:border-ink">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-cream py-1 pr-1.5 pl-3 text-[13px]">
            {v}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="grid size-4 place-items-center rounded-full hover:bg-line">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              onChange(withTag(value, draft));
              setDraft("");
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => {
            onChange(withTag(value, draft));
            setDraft("");
          }}
          placeholder={value.length ? "" : placeholder}
          className="min-w-24 flex-1 bg-transparent px-1.5 py-1 text-[15px] outline-none placeholder:text-ink-muted"
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.map((s) => (
            <button key={s} type="button" onClick={() => onChange(withTag(value, s))} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-muted hover:border-ink hover:text-ink">
              + {s}
            </button>
          ))}
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
            onClick={() => onChange(single ? (on ? [] : [o.value]) : on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              on ? "border-ink bg-ink text-on-ink" : "border-line-strong text-ink-soft hover:border-ink hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
