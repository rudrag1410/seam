"use client";

import { Checkbox, Segmented } from "@seam/ui";

export type SectionKey = "summary" | "skills" | "experience" | "projects";
export type Intensity = "light" | "balanced" | "bold";

const SECTIONS: { key: SectionKey; label: string; hint: string }[] = [
  { key: "summary", label: "Summary", hint: "Align the opening with the role" },
  { key: "skills", label: "Skills", hint: "Surface what matches, flag gaps" },
  { key: "experience", label: "Experience", hint: "Rephrase and reorder bullets" },
  { key: "projects", label: "Projects", hint: "Same treatment for projects" },
];
const INTENSITY: { value: Intensity; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "balanced", label: "Balanced" },
  { value: "bold", label: "Bold" },
];
const INTENSITY_HINT: Record<Intensity, string> = {
  light: "Fix terminology and ordering. Minimal rewording.",
  balanced: "Rephrase weak bullets and reorder for relevance.",
  bold: "Rewrite for impact. Still limited to what your resume supports.",
};

export function ScopePicker({ sections, onSections, intensity, onIntensity }: {
  sections: SectionKey[]; onSections: (s: SectionKey[]) => void; intensity: Intensity; onIntensity: (i: Intensity) => void;
}) {
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-3 text-[13px] font-medium">Sections to tailor</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <div key={s.key} className="rounded-[12px] border border-line p-3">
              <Checkbox
                checked={sections.includes(s.key)}
                onChange={(on) => onSections(on ? [...sections, s.key] : sections.filter((x) => x !== s.key))}
                label={<span className="font-medium">{s.label}</span>}
              />
              <p className="mt-1 pl-7 text-[12px] text-ink-muted">{s.hint}</p>
            </div>
          ))}
        </div>
      </fieldset>
      <div>
        <p className="mb-3 text-[13px] font-medium">Intensity</p>
        <Segmented size="sm" aria-label="Intensity" value={intensity} onChange={onIntensity} options={INTENSITY} />
        <p className="mt-2 text-[13px] text-ink-muted">{INTENSITY_HINT[intensity]}</p>
      </div>
    </div>
  );
}
