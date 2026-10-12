"use client";

import type { VersionOut } from "@seam/api-client";
import { Badge, Button, Checkbox, Skeleton, buttonClass } from "@seam/ui";
import { GitCompareArrows, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmDelete } from "@/components/feedback/ConfirmDelete";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageBody, PageHeader } from "@/components/shell/PageHeader";
import { api, unwrap } from "@/lib/api";
import { presentError } from "@/lib/errors";
import { timeAgo } from "@/lib/format";
import { keys, useVersions } from "@/lib/queries";
import { usePageTitle } from "@/lib/usePageTitle";

function togglePick(picked: string[], id: string, on: boolean): string[] {
  return on ? [...picked, id].slice(-2) : picked.filter((x) => x !== id);
}

function compareHref(versions: VersionOut[], picked: string[]): string {
  const [older, newer] = versions.filter((v) => picked.includes(v.id)).reverse();
  return `/resumes/compare?a=${older?.id}&b=${newer?.id}`;
}

interface VersionRowProps {
  version: VersionOut;
  picked: boolean;
  onPick: (on: boolean) => void;
  onDelete: () => void;
}

function VersionRow({ version: v, picked, onPick, onDelete }: VersionRowProps) {
  return (
    <div className="group flex items-center gap-4 py-4">
      <Checkbox
        checked={picked}
        onChange={onPick}
        label={<span className="sr-only">Select {v.label} to compare</span>}
      />
      <Link href={`/resumes/${v.id}`} className="min-w-0 flex-1">
        <p className="truncate font-medium">{v.label}</p>
        <p className="text-[13px] text-ink-muted">
          {timeAgo(v.created_at)}
          {v.parent_version_id && " · branched"}
        </p>
      </Link>
      {v.match_score != null && (
        <Badge className="tabular">Match {Math.round(v.match_score)}</Badge>
      )}
      {v.ats_score != null && <Badge className="tabular">ATS {Math.round(v.ats_score)}</Badge>}
      <button
        type="button"
        aria-label={`Delete ${v.label}`}
        onClick={onDelete}
        className="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-cream hover:text-ink focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function removeVersion(id: string) {
  return unwrap(api.DELETE("/v1/versions/{version_id}", { params: { path: { version_id: id } } }));
}

export default function Versions() {
  usePageTitle("Resumes");
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const remove = useMutation({
    mutationFn: removeVersion,
    onSuccess: (_, id) => {
      setConfirming(null);
      setPicked((p) => p.filter((x) => x !== id));
      toast.success("Version deleted");
      qc.invalidateQueries({ queryKey: keys.versions });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: (error) => toast.error(presentError(error).title),
  });
  const { data, isPending, error, refetch } = useVersions();
  const router = useRouter();

  return (
    <PageBody>
      <PageHeader
        title="Resumes"
        body="Every finalized review is saved as a version you can export, compare and branch from."
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={picked.length !== 2}
              onClick={() => router.push(compareHref(data ?? [], picked))}
            >
              <GitCompareArrows className="size-4" /> Compare
              {picked.length ? ` (${picked.length}/2)` : ""}
            </Button>
            <Link href="/tailor/new" className={buttonClass("primary", "md")}>
              New tailor
            </Link>
          </div>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[75px]" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title="No versions yet"
          body="Review a tailored resume and finalize it to save your first version."
          action={
            <Link href="/tailor/new" className={buttonClass("primary", "md")}>
              Start tailoring
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.map((v) => (
            <li key={v.id}>
              {confirming === v.id ? (
                <div className="py-3">
                  <ConfirmDelete
                    title={v.label}
                    note="Its exports and cover letters are removed. Other versions are kept."
                    busy={remove.isPending}
                    onConfirm={() => remove.mutate(v.id)}
                    onCancel={() => setConfirming(null)}
                  />
                </div>
              ) : (
                <VersionRow
                  version={v}
                  picked={picked.includes(v.id)}
                  onPick={(on) => setPicked((p) => togglePick(p, v.id, on))}
                  onDelete={() => setConfirming(v.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </PageBody>
  );
}
