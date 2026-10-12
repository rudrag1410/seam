"use client";

import { Badge, Button, Segmented } from "@seam/ui";
import { SessionStatus } from "@seam/api-client";
import { projectScore } from "@seam/resume-core";
import { ArrowRight, Undo2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ViewMode } from "../resume-canvas/view-model";
import { undo } from "../review/actions";
import { acceptedIds, pendingCount, useReview } from "../review/store";

const MODES = [
  { value: ViewMode.Suggestions, label: "Suggestions" },
  { value: ViewMode.Clean, label: "Clean" },
  { value: ViewMode.Original, label: "Original" },
];

function setMode(mode: ViewMode): void {
  useReview.setState({ mode });
}

export function ModeSwitch() {
  const mode = useReview((s) => s.mode);
  return <Segmented size="sm" aria-label="View" value={mode} onChange={setMode} options={MODES} />;
}

function Match() {
  const before = useReview((s) => s.scoreBefore);
  const suggestions = useReview((s) => s.suggestions);
  const live = useMemo(() => {
    if (!before) return null;
    return Math.round(projectScore(before.total, suggestions, acceptedIds(suggestions)));
  }, [before, suggestions]);
  if (!before || live == null) return null;
  const from = Math.round(before.total);
  return (
    <span className="tabular hidden h-8 shrink-0 items-center gap-1.5 rounded-full bg-cream px-3 text-[13px] xl:inline-flex" title="Estimated match with the job, before and with the changes you've accepted">
      <span className="text-ink-muted">Match</span>
      <span className="font-medium">{live === from ? from : `${from} → ${live}`}</span>
    </span>
  );
}

/** Always 56px tall, with or without a session, so starting a run doesn't move anything. */
interface WorkspaceHeaderProps {
  started: boolean;
  versionId?: string | null;
  onFinalize: () => void;
  finalizing: boolean;
}

export function WorkspaceHeader({ started, versionId, onFinalize, finalizing }: WorkspaceHeaderProps) {
  const s = useReview();
  const running = s.status === SessionStatus.Queued || s.status === SessionStatus.Running;
  const failed = s.status === SessionStatus.Failed;
  const title = !started ? "New tailor" : s.title || (running ? "Reading the job description…" : failed ? "Tailoring stopped" : "Tailored resume");
  const pending = pendingCount(s);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line bg-bg px-4 sm:px-6">
      <h1 className="min-w-0 flex-1 truncate text-[15px] font-medium tracking-[-0.01em]">{title}</h1>
      {started && !failed && (
        <>
          {s.reconnecting && <Badge tone="yellow">Reconnecting…</Badge>}
          {s.degraded && (
            <Badge className="hidden sm:inline-flex" title="Some checks are running in basic mode.">
              Basic mode
            </Badge>
          )}
          <Match />
          <div className="hidden md:block">
            <ModeSwitch />
          </div>
          <button
            type="button"
            onClick={undo}
            disabled={!s.history.length}
            aria-label="Undo (⌘Z)"
            title="Undo (⌘Z)"
            className="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-cream hover:text-ink disabled:opacity-35"
          >
            <Undo2 className="size-4" />
          </button>
          {s.status === SessionStatus.Finalized ? (
            versionId && (
              <Link href={`/resumes/${versionId}`} className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full bg-ink px-3.5 text-[13px] font-medium text-on-ink hover:opacity-90">
                Open version <ArrowRight className="size-3.5" />
              </Link>
            )
          ) : (
            <Button
              size="sm"
              disabled={s.status !== SessionStatus.Ready}
              loading={finalizing}
              onClick={onFinalize}
              title={pending > 0 ? `${pending} undecided ${pending === 1 ? "change" : "changes"} will be left out` : undefined}
            >
              Finalize <ArrowRight className="size-3.5" />
            </Button>
          )}
        </>
      )}
    </header>
  );
}
