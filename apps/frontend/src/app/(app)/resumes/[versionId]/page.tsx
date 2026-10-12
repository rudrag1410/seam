"use client";

import { Segmented, Skeleton, buttonClass } from "@seam/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, GitBranch } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/feedback/states";
import { CoverLetterPanel } from "@/features/cover-letter/CoverLetterPanel";
import { ResumeCanvas } from "@/features/resume-canvas/ResumeCanvas";
import { buildView } from "@/features/resume-canvas/view-model";
import { ScoreRing } from "@/features/scoring/ScoreRing";
import { ExportPanel } from "@/features/versions/ExportPanel";
import { InterviewPrepPanel } from "@/features/versions/InterviewPrepPanel";
import { api, unwrap } from "@/lib/api";
import { keys } from "@/lib/queries";

type Tab = "export" | "letter" | "prep";

export default function VersionPage() {
  const { versionId } = useParams<{ versionId: string }>();
  const [tab, setTab] = useState<Tab>("export");
  const q = useQuery({
    queryKey: keys.version(versionId),
    queryFn: () => unwrap(api.GET("/v1/versions/{version_id}", { params: { path: { version_id: versionId } } })),
  });
  const view = useMemo(() => (q.data ? buildView(q.data.document, [], "original") : []), [q.data]);

  if (q.isError) return <div className="mx-auto max-w-xl p-8"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <div className="p-8"><Skeleton className="mx-auto h-[720px] max-w-[794px]" /></div>;
  const v = q.data;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 bg-cream/40 px-3 py-6 sm:px-8">
        <div className="mx-auto mb-4 flex max-w-[794px] items-center gap-3">
          <Link href="/resumes" aria-label="Back to resumes" className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-bg hover:text-ink"><ArrowLeft className="size-4" /></Link>
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-medium tracking-[-0.01em]">{v.label}</h1>
        </div>
        <ResumeCanvas contact={v.document.contact} view={view} />
      </div>

      <aside className="border-t border-line bg-bg lg:sticky lg:top-0 lg:h-dvh lg:overflow-auto lg:border-t-0 lg:border-l" aria-label="Version tools">
        <div className="space-y-8 p-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <ScoreRing value={v.match_score ?? 0} size={84} label="Match" />
              <p className="mt-1 text-xs text-ink-muted">Match</p>
            </div>
            <div className="text-center">
              <ScoreRing value={v.ats_score ?? 0} size={84} label="ATS" />
              <p className="mt-1 text-xs text-ink-muted">ATS estimate</p>
            </div>
            <div className="ml-auto flex flex-col items-end gap-2">
              <Link href={`/tailor/new?base=${v.id}`} className={buttonClass("secondary", "sm")}><GitBranch className="size-3.5" /> Branch</Link>
            </div>
          </div>

          {v.ats && (
            <ul className="space-y-2">
              {v.ats.checks.map((c) => (
                <li key={c.key} className="text-[13px]">
                  <span className={c.passed ? "text-ins-line" : "text-del-line"} aria-hidden>{c.passed ? "✓" : "✗"}</span>{" "}
                  <span className="sr-only">{c.passed ? "Passed:" : "Needs work:"}</span>{c.label}
                  {!c.passed && c.hint && <p className="mt-0.5 pl-5 text-xs text-ink-muted">{c.hint}</p>}
                </li>
              ))}
            </ul>
          )}

          <div>
            <Segmented size="sm" aria-label="Tools" className="mb-5" value={tab} onChange={setTab}
              options={[{ value: "export", label: "Export" }, { value: "letter", label: "Cover letter" }, { value: "prep", label: "Interview prep" }]} />
            {tab === "export" && <ExportPanel versionId={v.id} />}
            {tab === "letter" && <CoverLetterPanel versionId={v.id} />}
            {tab === "prep" && <InterviewPrepPanel versionId={v.id} />}
          </div>
        </div>
      </aside>
    </div>
  );
}
