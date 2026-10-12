"use client";

import { SectionName } from "@seam/api-client";
import { cn } from "@seam/ui";
import { Check } from "lucide-react";

interface SectionOption {
  key: SectionName;
  label: string;
  hint: string;
}

const SECTIONS: SectionOption[] = [
  { key: SectionName.Summary, label: "Summary", hint: "Align the opening with the role" },
  { key: SectionName.Skills, label: "Skills", hint: "Surface what matches, flag gaps" },
  { key: SectionName.Experience, label: "Experience", hint: "Rephrase and reorder bullets" },
  { key: SectionName.Projects, label: "Projects", hint: "Same treatment for projects" },
];

interface SectionChipsProps {
  sections: SectionName[];
  onChange: (sections: SectionName[]) => void;
}

export function SectionChips({ sections, onChange }: SectionChipsProps) {
  return (
    <div
      role="group"
      aria-label="Sections to tailor"
      className="flex flex-wrap items-center gap-1.5"
    >
      {SECTIONS.map((s) => {
        const on = sections.includes(s.key);
        return (
          <button
            key={s.key}
            type="button"
            aria-pressed={on}
            title={s.hint}
            onClick={() =>
              onChange(on ? sections.filter((x) => x !== s.key) : [...sections, s.key])
            }
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12.5px] transition-colors",
              on
                ? "border-ink bg-cream text-ink"
                : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {on && <Check className="size-3" strokeWidth={3} aria-hidden />}
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
