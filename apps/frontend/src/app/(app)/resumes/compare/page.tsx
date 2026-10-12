"use client";

import { Badge, Skeleton } from "@seam/ui";
import { wordDiff } from "@seam/resume-core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { ErrorState } from "@/components/feedback/states";
import { InlineDiff } from "@/features/resume-canvas/InlineDiff";
import { ResumeCanvas } from "@/features/resume-canvas/ResumeCanvas";
import { buildView } from "@/features/resume-canvas/view-model";
import { api, unwrap } from "@/lib/api";

const KIND = { added: "Added", removed: "Removed", changed: "Changed", moved: "Moved" } as const;

function Delta({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return <Badge tone={value > 0 ? "green" : value < 0 ? "orange" : "neutral"} className="tabular">{label} {value > 0 ? "+" : ""}{value}</Badge>;
}

function Compare() {
  const params = useSearchParams();
  const a = params.get("a");
  const b = params.get("b");
  const q = useQuery({
    queryKey: ["compare", a, b],
    enabled: !!a && !!b,
    queryFn: () => unwrap(api.GET("/v1/versions/{a}/compare/{b}", { params: { path: { a: a!, b: b! } } })),
  });
  const views = useMemo(
    () => q.data ? { A: buildView(q.data.a.document, [], "original"), B: buildView(q.data.b.document, [], "original") } : null,
    [q.data],
  );

  if (!a || !b) return <p className="p-8">Pick two versions to compare.</p>;
  if (q.isError) return <div className="mx-auto max-w-xl p-8"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!q.data || !views) return <div className="p-8"><Skeleton className="h-96" /></div>;
  const d = q.data;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Link href="/resumes" aria-label="Back" className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-cream"><ArrowLeft className="size-4" /></Link>
        <h1 className="font-display text-[34px]">Compare versions</h1>
        <div className="ml-auto flex gap-2"><Delta label="Match" value={d.match_delta} /><Delta label="ATS" value={d.ats_delta} /></div>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-[11px] font-medium tracking-[0.08em] text-ink-muted uppercase">{d.changes.length} changes from A to B</h2>
        {d.changes.length === 0 ? <p className="text-ink-muted">These versions are identical.</p> : (
          <ul className="divide-y divide-line border-y border-line">
            {d.changes.map((c) => (
              <li key={`${c.kind}-${c.node_id}`} className="grid gap-2 py-3 text-[14px] sm:grid-cols-[96px_1fr]">
                <span className="text-[12px] font-medium text-ink-muted uppercase">{KIND[c.kind]} · {c.section}</span>
                <span>{c.kind === "changed" && c.before != null && c.after != null ? <InlineDiff runs={wordDiff(c.before, c.after)} /> : (c.after ?? c.before)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {([[d.a, "A"], [d.b, "B"]] as const).map(([v, tag]) => (
          <div key={tag} className="min-w-0 bg-cream/40 p-3 sm:p-6">
            <p className="mb-3 text-sm font-medium"><span className="mr-2 rounded-full bg-ink px-2 py-0.5 text-xs text-on-ink">{tag}</span>{v.label}</p>
            <ResumeCanvas contact={v.document.contact} view={views[tag]} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><Compare /></Suspense>;
}
