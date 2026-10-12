"use client";

import { Intensity, SectionName } from "@seam/api-client";
import { Checkbox, Segmented } from "@seam/ui";

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

export const INTENSITY_LABEL: Record<Intensity, string> = {
  [Intensity.Light]: "Light",
  [Intensity.Balanced]: "Balanced",
  [Intensity.Bold]: "Bold",
};

const INTENSITY = Object.values(Intensity).map((value) => ({
  value,
  label: INTENSITY_LABEL[value],
}));

const INTENSITY_HINT: Record<Intensity, string> = {
  [Intensity.Light]: "Fix terminology and ordering. Minimal rewording.",
  [Intensity.Balanced]: "Rephrase weak bullets and reorder for relevance.",
  [Intensity.Bold]: "Rewrite for impact. Still limited to what your resume supports.",
};

interface ScopePickerProps {
  sections: SectionName[];
  onSections: (sections: SectionName[]) => void;
  intensity: Intensity;
  onIntensity: (intensity: Intensity) => void;
}

export function ScopePicker({ sections, onSections, intensity, onIntensity }: ScopePickerProps) {
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-3 text-[13px] font-medium">Sections to tailor</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <div key={s.key} className="rounded-[12px] border border-line p-3">
              <Checkbox
                checked={sections.includes(s.key)}
                onChange={(on) =>
                  onSections(on ? [...sections, s.key] : sections.filter((x) => x !== s.key))
                }
                label={<span className="font-medium">{s.label}</span>}
              />
              <p className="mt-1 pl-7 text-[12px] text-ink-muted">{s.hint}</p>
            </div>
          ))}
        </div>
      </fieldset>
      <div>
        <p className="mb-3 text-[13px] font-medium">Intensity</p>
        <Segmented
          size="sm"
          aria-label="Intensity"
          value={intensity}
          onChange={onIntensity}
          options={INTENSITY}
        />
        <p className="mt-2 text-[13px] text-ink-muted">{INTENSITY_HINT[intensity]}</p>
      </div>
    </div>
  );
}
