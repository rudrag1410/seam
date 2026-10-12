"use client";

import { ChangeKind } from "@seam/api-client";
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
import { ViewMode, buildView } from "@/features/resume-canvas/view-model";
import { PaperSkeleton } from "@/features/workspace/WorkspaceSkeleton";
import { api, unwrap } from "@/lib/api";

const KIND: Record<ChangeKind, string> = {
  [ChangeKind.Added]: "Added",
  [ChangeKind.Removed]: "Removed",
  [ChangeKind.Changed]: "Changed",
  [ChangeKind.Moved]: "Moved",
};

interface DeltaProps {
  label: string;
  value: number | null;
}

function Delta({ label, value }: DeltaProps) {
  if (value == null) return null;
  return (
    <Badge tone={value > 0 ? "green" : value < 0 ? "orange" : "neutral"} className="tabular">
      {label} {value > 0 ? "+" : ""}
      {value}
    </Badge>
  );
}

function CompareSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8" aria-busy>
      <div className="mb-8 flex items-center gap-3">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-9 w-72" />
      </div>
      <Skeleton className="mb-10 h-40" />
      <div className="grid gap-6 xl:grid-cols-2">
        <PaperSkeleton />
        <PaperSkeleton />
      </div>
    </div>
  );
}

function Compare() {
  const params = useSearchParams();
  const a = params.get("a");
  const b = params.get("b");
  const q = useQuery({
    queryKey: ["compare", a, b],
    enabled: !!a && !!b,
    queryFn: () =>
      unwrap(api.GET("/v1/versions/{a}/compare/{b}", { params: { path: { a: a!, b: b! } } })),
  });
  const views = useMemo(
    () =>
      q.data
        ? {
            A: buildView(q.data.a.document, [], ViewMode.Original),
            B: buildView(q.data.b.document, [], ViewMode.Original),
          }
        : null,
    [q.data],
  );

  if (!a || !b) return <p className="p-8">Pick two versions to compare.</p>;
  if (q.isError)
    return (
      <div className="mx-auto max-w-xl p-8">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </div>
    );
  if (!q.data || !views) return <CompareSkeleton />;
  const d = q.data;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Link
          href="/resumes"
          aria-label="Back"
          className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-cream"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-[34px]">Compare versions</h1>
        <div className="ml-auto flex gap-2">
          <Delta label="Match" value={d.match_delta} />
          <Delta label="ATS" value={d.ats_delta} />
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-[11px] font-medium tracking-[0.08em] text-ink-muted uppercase">
          {d.changes.length} {d.changes.length === 1 ? "change" : "changes"} from A to B
        </h2>
        {d.changes.length === 0 ? (
          <p className="text-ink-muted">These versions are identical.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {d.changes.map((c) => (
              <li
                key={`${c.kind}-${c.node_id}`}
                className="grid gap-2 py-3 text-[14px] sm:grid-cols-[96px_1fr]"
              >
                <span className="text-[12px] font-medium text-ink-muted uppercase">
                  {KIND[c.kind]} · {c.section}
                </span>
                <span>
                  {c.kind === ChangeKind.Changed && c.before != null && c.after != null ? (
                    <InlineDiff runs={wordDiff(c.before, c.after)} />
                  ) : (
                    (c.after ?? c.before)
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {(
          [
            [d.a, "A"],
            [d.b, "B"],
          ] as const
        ).map(([v, tag]) => (
          <div key={tag} className="min-w-0 bg-cream/40 p-3 sm:p-6">
            <p className="mb-3 text-sm font-medium">
              <span className="mr-2 rounded-full bg-ink px-2 py-0.5 text-xs text-on-ink">
                {tag}
              </span>
              {v.label}
            </p>
            <ResumeCanvas contact={v.document.contact} view={views[tag]} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Compare />
    </Suspense>
  );
}
