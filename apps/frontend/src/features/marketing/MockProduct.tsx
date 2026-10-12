import { Badge } from "@seam/ui";
import { ArrowUp, Check } from "lucide-react";

export function MockReview() {
  return (
    <div className="mx-auto w-full max-w-[460px] rounded-[14px] bg-bg p-5 text-left shadow-[0_0_0_1px_var(--line)]">
      <div className="mb-3 flex items-center justify-between text-xs text-ink-muted">
        <span className="font-medium text-ink">Experience · Acme Commerce</span>
        <span className="tabular">7 of 12 reviewed</span>
      </div>
      <ul className="space-y-3 text-[13.5px] leading-relaxed">
        <li className="rounded-md border-l-2 border-ins-line pl-3">
          <del className="rounded-sm bg-del px-0.5 text-ink-soft decoration-del-line">
            Improved checkout page performance using Next.js SSR
          </del>{" "}
          <ins className="rounded-sm bg-ins px-0.5 no-underline decoration-ins-line">
            Cut checkout LCP by 38% by moving the page to Next.js server-side rendering
          </ins>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone="green">
              <Check className="size-3" /> Matches “Core Web Vitals”
            </Badge>
            <span className="tabular text-xs text-ink-muted">+4.5 match</span>
          </div>
        </li>
        <li className="rounded-md border-l-2 border-yellow pl-3">
          Added <ins className="rounded-sm bg-warn px-0.5 text-warn-ink no-underline">GraphQL</ins>{" "}
          to Skills
          <div className="mt-2 flex items-center gap-2">
            <Badge tone="yellow">Only accept if true</Badge>
          </div>
        </li>
        <li className="pl-3 text-ink-muted">
          Built reusable components for the internal design system…
        </li>
      </ul>
      <div className="mt-4 flex gap-2">
        <span className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-medium text-on-ink">
          Accept
        </span>
        <span className="rounded-full bg-cream px-4 py-1.5 text-[13px] font-medium">Reject</span>
        <span className="rounded-full bg-cream px-4 py-1.5 text-[13px] font-medium">Edit</span>
      </div>
    </div>
  );
}

export function MockScore() {
  const rows = [
    ["React and TypeScript", 4],
    ["Core Web Vitals", 3.2],
    ["Next.js SSR", 3],
    ["GraphQL", 0.4],
  ] as const;
  return (
    <div className="mx-auto w-full max-w-[460px] rounded-[14px] bg-bg p-5 text-left shadow-[0_0_0_1px_var(--line)]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-ink-muted">Match</p>
          <p className="font-display tabular text-5xl">
            64 <span className="text-ink-muted">→</span> 81
          </p>
        </div>
        <Badge tone="green">
          <ArrowUp className="size-3" /> 17
        </Badge>
      </div>
      <ul className="mt-5 space-y-3">
        {rows.map(([label, level]) => (
          <li key={label}>
            <div className="mb-1 flex justify-between text-[13px]">
              <span>{label}</span>
              <span className="tabular text-ink-muted">
                {level >= 3 ? "Demonstrated" : level >= 1 ? "Listed" : "Missing"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-cream">
              <div
                className="h-full rounded-full bg-ink"
                style={{ width: `${(level / 4) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MockExport() {
  return (
    <div className="mx-auto w-full max-w-[460px] rounded-[14px] bg-bg p-6 text-left shadow-[0_0_0_1px_var(--line)]">
      <p className="text-center font-serif text-xl">Aarav Mehta</p>
      <p className="mb-4 text-center text-[11px] text-ink-muted">
        Bengaluru · aarav@example.com · github.com/aaravm
      </p>
      <p className="border-b border-ink pb-0.5 text-[11px] font-semibold tracking-wide">
        EXPERIENCE
      </p>
      <p className="mt-2 text-[12.5px] font-semibold">SDE II — Acme Commerce</p>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-[12px] leading-snug text-ink-soft">
        <li>Cut checkout LCP by 38% by moving the page to Next.js server-side rendering</li>
        <li>Built reusable components for the design system used by 6 product teams</li>
      </ul>
      <div className="mt-5 flex gap-2">
        {["PDF", "DOCX", "TXT"].map((f) => (
          <span key={f} className="rounded-full bg-cream px-3.5 py-1 text-xs font-medium">
            {f}
          </span>
        ))}
        <Badge tone="green" className="ml-auto">
          ATS 92
        </Badge>
      </div>
    </div>
  );
}
