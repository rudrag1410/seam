"use client";

import { Badge, Button, cn } from "@seam/ui";
import { projectScore } from "@seam/resume-core";
import { Link2 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { FitCheck } from "../jd/FitCheck";
import { JdInsightsCard } from "../jd/JdInsightsCard";
import { useReview } from "../review/store";
import { Breakdown, KeywordList } from "../scoring/Breakdown";
import { ScoreRing } from "../scoring/ScoreRing";
import { RunCard } from "./RunCard";
import { buildSteps, closingMessage } from "./steps";

export function Say({ children, tone }: { children: ReactNode; tone?: "error" }) {
  return <p className={cn("text-[15px] leading-relaxed text-pretty", tone === "error" ? "text-del-line" : "text-ink")}>{children}</p>;
}

export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="ml-auto max-w-[88%] rounded-[18px] border border-line bg-bg px-4 py-2.5 text-[14.5px] leading-relaxed shadow-[0_1px_2px_rgba(16,15,15,0.04)]">
      {children}
    </div>
  );
}

function JobBubble({ text, url }: { text: string; url: string | null }) {
  const [open, setOpen] = useState(false);
  if (!text && url) {
    return (
      <UserBubble>
        <span className="flex items-center gap-2 break-all">
          <Link2 className="size-4 shrink-0 text-ink-muted" aria-hidden /> {url}
        </span>
      </UserBubble>
    );
  }
  const long = text.length > 280;
  return (
    <UserBubble>
      <p className={cn("break-words whitespace-pre-line", !open && "line-clamp-4")}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-[13px] text-ink-muted underline underline-offset-4 hover:text-ink">
          {open ? "Show less" : "Show the full posting"}
        </button>
      )}
    </UserBubble>
  );
}

function Typing() {
  return (
    <span className="flex h-6 items-center gap-1" role="status" aria-label="Working">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-pulse rounded-full bg-ink-muted" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </span>
  );
}

function ScoreDetails() {
  const s = useReview();
  const before = s.scoreBefore;
  const accepted = useMemo(
    () => new Set(s.suggestions.filter((x) => x.status === "accepted" || x.status === "edited").map((x) => x.id)),
    [s.suggestions],
  );
  if (!before) return null;
  const live = projectScore(before.total, s.suggestions, accepted);
  const best = s.scoreProjected?.total;
  return (
    <div className="space-y-4 py-1">
      <div className="flex items-center gap-4">
        <ScoreRing value={live} size={72} stroke={6} />
        <div className="text-[13px]">
          <p className="font-medium">
            {Math.round(before.total)} before, {Math.round(live)} with what you&apos;ve accepted
          </p>
          {best != null && best > live && <p className="text-ink-muted">Up to {Math.round(best)} with every suggestion</p>}
          <Badge className="mt-1.5">Estimate</Badge>
        </div>
      </div>
      {before.requirements.length > 0 && (
        <div className="-mx-2">
          <Breakdown score={before} activeReq={s.activeReq} onPick={(id) => s.patch({ activeReq: id })} />
        </div>
      )}
      {(before.matched_keywords.length > 0 || before.missing_keywords.length > 0) && (
        <div>
          <KeywordList matched={before.matched_keywords} missing={before.missing_keywords} />
          {before.missing_keywords.length > 0 && (
            <p className="mt-2 text-xs text-ink-muted">Dashed keywords aren&apos;t on your resume. Add them only if they&apos;re true.</p>
          )}
        </div>
      )}
      {s.fit && s.fit.items.length > 0 && <FitCheck fit={s.fit} />}
    </div>
  );
}

/** The conversation. Everything in it is derived from the run's state, so a refresh or a
 *  reconnect rebuilds exactly the same thread. */
export function Thread({ intro, onRetry, onEditJob, retrying }: {
  /** Shown before anything has been sent: the greeting and the resume in use. */
  intro: ReactNode;
  onRetry: () => void;
  onEditJob: () => void;
  retrying: boolean;
}) {
  const s = useReview();
  const started = s.status !== "loading";
  const steps = useMemo(() => buildSteps(s), [s]);
  const closing = useMemo(() => closingMessage(s), [s]);
  const allDecided = s.status === "ready" && s.suggestions.length > 0 && !s.asking && s.suggestions.every((x) => x.status !== "pending");
  const safeLeft = s.status === "ready" ? s.suggestions.filter((x) => x.status === "pending" && !x.requires_confirmation).length : 0;
  const jobProblem = !!s.error && /\b(JD|URL)_/.test(s.error.code);

  // keep the newest line in view while things arrive, without fighting someone reading back
  const end = useRef<HTMLDivElement>(null);
  const signature = `${s.status}|${!!s.jd}|${!!s.scoreBefore}|${s.suggestions.length}|${s.notes.length}|${s.asking}|${allDecided}`;
  useEffect(() => {
    const scroller = end.current?.closest<HTMLElement>("[data-thread]");
    if (!scroller || scroller.scrollHeight <= scroller.clientHeight) return;
    if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 480) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    }
  }, [signature]);

  const jump = (section: string) => {
    const inSection = s.suggestions.filter((x) => x.section === section);
    const target = inSection.find((x) => x.status === "pending") ?? inSection[0];
    if (target) s.patch({ mode: "suggestions", cursor: target.id, editing: null, confirming: null });
  };

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 py-6 sm:px-5">
      {intro}

      {started && (
        <>
          {(s.jdText || s.jdUrl) && <JobBubble text={s.jdText} url={s.jdUrl} />}
          <RunCard
            steps={steps}
            onJump={s.status === "finalized" ? undefined : jump}
            footer={
              safeLeft > 0 ? (
                <button
                  type="button"
                  onClick={s.acceptAllSafe}
                  className="mt-1 ml-2 text-[12.5px] text-ink-muted underline underline-offset-4 hover:text-ink"
                >
                  Accept the {safeLeft} that only use what&apos;s already on your resume
                </button>
              ) : null
            }
            details={{
              read: s.jd ? (
                <div className="py-1">
                  <JdInsightsCard analysis={s.jd} activeReq={s.activeReq} onPick={(id) => s.patch({ activeReq: id })} />
                  <p className="mt-3 text-xs text-ink-muted">Pick a requirement to highlight the lines that address it.</p>
                </div>
              ) : undefined,
              score: <ScoreDetails />,
            }}
          />
          {s.warnings.map((w) => (
            <Say key={w}>{w}</Say>
          ))}

          {s.status === "failed" && s.error && (
            <div className="space-y-3">
              <Say tone="error">{s.error.message}</Say>
              {jobProblem ? (
                <Button size="sm" onClick={onEditJob}>
                  Edit the job description
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" onClick={onRetry} loading={retrying}>
                    Try again
                  </Button>
                  <span className="text-[13px] text-ink-muted">Your resume and the job description are saved.</span>
                </div>
              )}
            </div>
          )}

          {closing && <Say>{closing}</Say>}
          {s.degraded && closing && <Say>Some checks ran in basic mode, so treat the score as a rough guide.</Say>}
          {closing && s.status === "ready" && s.suggestions.length > 0 && s.notes.length === 0 && (
            <Say>Go through them below, or click any highlighted line on the resume. Finalize when you&apos;re happy.</Say>
          )}

          {s.notes.map((n) => (n.role === "user" ? <UserBubble key={n.id}>{n.text}</UserBubble> : <Say key={n.id} tone={n.tone}>{n.text}</Say>))}
          {s.asking && <Typing />}
          {allDecided && <Say>That&apos;s all of them reviewed. Finalize to save this version, or step back through any you want to change.</Say>}
          {s.status === "finalized" && <Say>This review is finalized. The saved version is in Resumes.</Say>}
        </>
      )}
      <div ref={end} />
    </div>
  );
}
