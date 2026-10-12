import type { FitCheck as Fit, JDAnalysis } from "@seam/api-client";
import { Badge } from "@seam/ui";
import { FitCheck } from "./FitCheck";

const MODE = { remote: "Remote", hybrid: "Hybrid", onsite: "Onsite" } as const;
const TYPE = { full_time: "Full-time", contract: "Contract", part_time: "Part-time", internship: "Internship", freelance: "Freelance" } as const;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-[11px] font-medium tracking-[0.08em] text-ink-muted uppercase">{title}</h4>
      {children}
    </div>
  );
}

function Requirement({ requirement: r, activeReq, onPick }: {
  requirement: JDAnalysis["must_haves"][number]; activeReq?: string | null; onPick?: (id: string | null) => void;
}) {
  return (
    <li>
      <button
        type="button" onClick={() => onPick?.(activeReq === r.id ? null : r.id)} aria-pressed={activeReq === r.id}
        className={`w-full rounded-lg px-2 py-1.5 text-left text-[13px] leading-snug ${onPick ? "hover:bg-cream" : "cursor-default"} ${activeReq === r.id ? "bg-cream" : ""}`}
      >
        {r.text}
      </button>
    </li>
  );
}

export function JdInsightsCard({ analysis: a, fit, activeReq, onPick }: {
  analysis: JDAnalysis; fit?: Fit | null; activeReq?: string | null; onPick?: (id: string | null) => void;
}) {
  const facets = [
    a.seniority !== "unspecified" && a.seniority[0]!.toUpperCase() + a.seniority.slice(1),
    a.work_mode !== "unspecified" && MODE[a.work_mode as keyof typeof MODE],
    a.employment_type !== "unspecified" && TYPE[a.employment_type as keyof typeof TYPE],
    a.location,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[19px] leading-tight font-medium tracking-[-0.02em]">{a.title || "Job description"}</h3>
        {a.company && <p className="text-sm text-ink-muted">{a.company}</p>}
        {facets.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{facets.map((f) => <Badge key={f}>{f}</Badge>)}</div>}
      </div>
      <Group title="Must-haves"><ul className="-mx-2">{a.must_haves.map((r) => <Requirement key={r.id} requirement={r} activeReq={activeReq} onPick={onPick} />)}</ul></Group>
      {a.nice_to_haves.length > 0 && <Group title="Nice to have"><ul className="-mx-2">{a.nice_to_haves.map((r) => <Requirement key={r.id} requirement={r} activeReq={activeReq} onPick={onPick} />)}</ul></Group>}
      {a.keywords.length > 0 && (
        <Group title="Keywords">
          <div className="flex flex-wrap gap-1.5">
            {a.keywords.map((k, i) => (
              <span key={k} className={`rounded-full border border-line-strong px-2.5 py-0.5 ${i < 4 ? "text-[13px] font-medium" : "text-xs text-ink-soft"}`}>{k}</span>
            ))}
          </div>
        </Group>
      )}
      {fit && fit.items.length > 0 && <Group title="Fit check"><FitCheck fit={fit} /></Group>}
    </div>
  );
}
