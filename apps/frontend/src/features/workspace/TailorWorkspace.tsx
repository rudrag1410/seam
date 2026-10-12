"use client";

import { SessionStatus } from "@seam/api-client";
import { useRef } from "react";
import { ErrorState } from "@/components/feedback/states";
import { ViewMode } from "@/features/resume-canvas/view-model";
import { useReview } from "@/features/review/store";
import { useReviewKeys } from "@/features/review/useReviewKeys";
import { AskComposer } from "./AskComposer";
import { Intro } from "./Intro";
import { JobComposer } from "./JobComposer";
import { Paper } from "./Paper";
import { ReviewDock } from "./ReviewDock";
import { Thread } from "./Thread";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceSkeleton } from "./WorkspaceSkeleton";
import { draftFromRun, jobProblem } from "./run";
import { useFollowCursor } from "./useFollowCursor";
import { useJobDraft } from "./useJobDraft";
import { abandonRun, retryRun, startRun, useTailorSession } from "./useTailorSession";

interface TailorWorkspaceProps {
  initialSessionId?: string;
  baseVersionId?: string | null;
}

/** One screen for the whole job: the job description goes in on the left, the run streams into
 *  the same conversation, and the resume on the right picks up suggestions as they arrive.
 *  Starting a run changes the address but never swaps the screen.
 *
 *  This component only lays the pieces out. The session lives in `useTailorSession`, the text
 *  being typed in `useJobDraft`, and everything shown is read from the review store. */
export function TailorWorkspace({ initialSessionId, baseVersionId = null }: TailorWorkspaceProps) {
  const session = useTailorSession(initialSessionId, baseVersionId);
  const status = useReview((s) => s.status);
  const mode = useReview((s) => s.mode);
  const cursor = useReview((s) => s.cursor);
  const resume = useReview((s) => s.resume);
  const paper = useRef<HTMLDivElement>(null);

  const started = status !== null;
  const composing = !session.sessionId && !started;
  const reviewing = started && status !== SessionStatus.Finalized && status !== SessionStatus.Failed && mode === ViewMode.Suggestions;
  const [draft, setDraft] = useJobDraft(composing, !!session.sessionId);

  useReviewKeys(status === SessionStatus.Ready);
  useFollowCursor(paper, cursor, reviewing);

  if (initialSessionId && session.query.isError) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <ErrorState error={session.query.error} onRetry={() => session.query.refetch()} />
      </div>
    );
  }
  // a session opened by its address has nothing to show until it loads
  if (!composing && !started) return <WorkspaceSkeleton />;

  const problem = jobProblem(session.fault);
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <WorkspaceHeader
        started={started}
        versionId={session.query.data?.version_id}
        finalizing={session.finalize.isPending}
        onFinalize={() => session.sessionId && session.finalize.mutate(session.sessionId)}
      />

      {/* One set of elements for both layouts. Wide: conversation and composer stacked on the
          left, paper on the right. Narrow: conversation, paper, then the composer pinned below. */}
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(380px,460px)_1fr] lg:grid-rows-[minmax(0,1fr)_auto]">
        <div data-thread className="scroll-thin border-line lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto lg:border-r">
          <Thread
            intro={<Intro composing={composing} branching={!!baseVersionId} />}
            retrying={session.create.isPending}
            onRetry={() => retryRun(session)}
            onEditJob={() => {
              setDraft((d) => draftFromRun(useReview.getState(), d));
              abandonRun(session);
            }}
          />
        </div>

        <Paper resume={resume ?? session.baseResume} loading={session.loadingResume} started={started} reviewing={reviewing} scroller={paper} />

        <div className="sticky bottom-0 z-10 border-t border-line bg-bg px-4 py-3 sm:px-5 lg:static lg:col-start-1 lg:row-start-2 lg:border-r">
          <div className="mx-auto w-full max-w-[600px] space-y-3">
            {composing ? (
              <>
                {!!session.fault && !problem && <ErrorState error={session.fault} onRetry={() => startRun(session, draft)} />}
                <JobComposer
                  draft={draft}
                  sending={session.create.isPending}
                  error={problem}
                  disabledReason={!session.primary.data && !session.primary.isPending ? "Upload your resume first." : undefined}
                  onSend={() => startRun(session, draft)}
                  onChange={(patch) => {
                    session.setFault(null);
                    setDraft((d) => ({ ...d, ...patch }));
                  }}
                />
              </>
            ) : (
              <>
                {reviewing && <ReviewDock />}
                <AskComposer sessionId={session.sessionId ?? ""} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
