"use client";

import { Badge, Button, Checkbox, Skeleton, buttonClass } from "@seam/ui";
import { GitCompareArrows } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageBody, PageHeader } from "@/components/shell/PageHeader";
import { timeAgo } from "@/lib/format";
import { useVersions } from "@/lib/queries";

function togglePick(picked: string[], id: string, on: boolean): string[] {
  return on ? [...picked, id].slice(-2) : picked.filter((x) => x !== id);
}

export default function Versions() {
  const { data, isPending, error, refetch } = useVersions();
  const [picked, setPicked] = useState<string[]>([]);
  const router = useRouter();

  return (
    <PageBody>
      <PageHeader
        title="Resumes"
        body="Every finalized review is saved as a version you can export, compare and branch from."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" disabled={picked.length !== 2} onClick={() => router.push(`/resumes/compare?a=${picked[0]}&b=${picked[1]}`)}>
              <GitCompareArrows className="size-4" /> Compare{picked.length ? ` (${picked.length}/2)` : ""}
            </Button>
            <Link href="/tailor/new" className={buttonClass("primary", "md")}>New tailor</Link>
          </div>
        }
      />
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : isPending ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[75px]" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState title="No versions yet" body="Review a tailored resume and finalize it to save your first version."
          action={<Link href="/tailor/new" className={buttonClass("primary", "md")}>Start tailoring</Link>} />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.map((v) => (
            <li key={v.id} className="flex items-center gap-4 py-4">
              <Checkbox checked={picked.includes(v.id)} onChange={(on) => setPicked((p) => togglePick(p, v.id, on))} label={<span className="sr-only">Select {v.label} to compare</span>} />
              <Link href={`/resumes/${v.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium">{v.label}</p>
                <p className="text-[13px] text-ink-muted">{timeAgo(v.created_at)}{v.parent_version_id && " · branched"}</p>
              </Link>
              {v.match_score != null && <Badge className="tabular">Match {Math.round(v.match_score)}</Badge>}
              {v.ats_score != null && <Badge className="tabular">ATS {Math.round(v.ats_score)}</Badge>}
            </li>
          ))}
        </ul>
      )}
    </PageBody>
  );
}
