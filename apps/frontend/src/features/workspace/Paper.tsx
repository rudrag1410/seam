"use client";

import type { Resume } from "@seam/api-client";
import { type RefObject, useMemo } from "react";
import { ResumeCanvas } from "@/features/resume-canvas/ResumeCanvas";
import {
  KIND_OF_SECTION,
  type SectionKind,
  ViewMode,
  buildView,
} from "@/features/resume-canvas/view-model";
import { select } from "@/features/review/actions";
import { type ReviewState, useReview } from "@/features/review/store";
import { ModeSwitch } from "./WorkspaceHeader";
import { PaperSkeleton } from "./WorkspaceSkeleton";
import { StepKey, StepState, buildSteps } from "./steps";

function addressing(s: ReviewState): Set<string> {
  if (!s.activeReq) return new Set();
  return new Set(s.suggestions.filter((x) => x.addresses.includes(s.activeReq!)).map((x) => x.id));
}

function sectionsInProgress(s: ReviewState): Set<SectionKind> {
  const parts = buildSteps(s).find((step) => step.key === StepKey.Write)?.parts ?? [];
  return new Set(
    parts.filter((p) => p.state === StepState.Running).map((p) => KIND_OF_SECTION[p.key]),
  );
}

interface PaperProps {
  resume: Resume | null;
  loading: boolean;
  started: boolean;
  reviewing: boolean;
  scroller: RefObject<HTMLDivElement | null>;
}

export function Paper({ resume, loading, started, reviewing, scroller }: PaperProps) {
  const s = useReview();
  const view = useMemo(
    () => (resume ? buildView(resume, s.suggestions, started ? s.mode : ViewMode.Original) : []),
    [resume, s.suggestions, s.mode, started],
  );
  const highlight = useMemo(() => addressing(s), [s]);
  const busy = useMemo(() => sectionsInProgress(s), [s]);

  return (
    <div
      ref={scroller}
      className="scroll-thin bg-cream/40 px-3 py-6 sm:px-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto"
    >
      {started && (
        <div className="mx-auto mb-4 flex max-w-[794px] md:hidden">
          <ModeSwitch />
        </div>
      )}
      {resume ? (
        <ResumeCanvas
          contact={resume.contact}
          view={view}
          cursor={reviewing ? s.cursor : null}
          highlight={highlight}
          onSelect={reviewing ? select : undefined}
          busy={busy}
        />
      ) : loading ? (
        <PaperSkeleton />
      ) : (
        <div className="mx-auto grid h-64 max-w-[794px] place-items-center border border-dashed border-line-strong text-sm text-ink-muted">
          Your resume will appear here once it&apos;s uploaded.
        </div>
      )}
    </div>
  );
}
