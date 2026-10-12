"use client";

import { Badge, Button, cn } from "@seam/ui";
import { projectScore } from "@seam/resume-core";
import { Link2 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { FitCheck } from "../jd/FitCheck";
import { JdInsightsCard } from "../jd/JdInsightsCard";
import { acceptAllSafe, select } from "../review/actions";
import { isJobTextCode } from "@/lib/errors";
import { NoteRole, NoteTone, acceptedIds, useReview } from "../review/store";
import { ViewMode } from "../resume-canvas/view-model";
import { Decision, type SectionName, SessionStatus } from "@seam/api-client";
import { Breakdown, KeywordList } from "../scoring/Breakdown";
import { ScoreRing } from "../scoring/ScoreRing";
import { RunCard } from "./RunCard";
import { buildSteps, closingMessage } from "./steps";

function highlightRequirement(id: string | null): void {
  useReview.setState({ activeReq: id });
}

function jumpToSection(section: SectionName): void {
  const inSection = useReview.getState().suggestions.filter((x) => x.section === section);
  const target = inSection.find((x) => x.status === Decision.Pending) ?? inSection[0];
  if (!target) return;
  useReview.setState({ mode: ViewMode.Suggestions });
  select(target.id);
}

function followLatest(end: HTMLElement | null): void {
  const scroller = end?.closest<HTMLElement>("[data-thread]");
  if (!scroller || scroller.scrollHeight <= scroller.clientHeight) return;
  if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 480) {
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  }
}

export function Say({ children, tone }: SayProps) {
  return <p className={cn("text-[15px] leading-relaxed text-pretty", tone === NoteTone.Error ? "text-del-line" : "text-ink")}>{children}</p>;
}

interface SayProps {
  children: ReactNode;
  tone?: NoteTone;
}

interface UserBubbleProps {
  children: ReactNode;
}

function UserBubble({ children }: UserBubbleProps) {
  return (
    <div className="ml-auto max-w-[88%] rounded-[18px] border border-line bg-bg px-4 py-2.5 text-[14.5px] leading-relaxed shadow-[0_1px_2px_rgba(16,15,15,0.04)]">
      {children}
    </div>
  );
}

interface JobBubbleProps {
  text: string;
  url: string | null;
}

function JobBubble({ text, url }: JobBubbleProps) {
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
  const accepted = useMemo(() => acceptedIds(s.suggestions), [s.suggestions]);
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
          <Breakdown score={before} activeReq={s.activeReq} onPick={highlightRequirement} />
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

interface ThreadProps {
  intro: ReactNode;
  onRetry: () => void;
  onEditJob: () => void;
  retrying: boolean;
}

export function Thread({ intro, onRetry, onEditJob, retrying }: ThreadProps) {
  const s = useReview();
  const started = s.status !== null;
  const steps = useMemo(() => buildSteps(s), [s]);
  const closing = useMemo(() => closingMessage(s), [s]);
  const allDecided = s.status === SessionStatus.Ready && s.suggestions.length > 0 && !s.asking && s.suggestions.every((x) => x.status !== Decision.Pending);
  const safeLeft = s.status === SessionStatus.Ready ? s.suggestions.filter((x) => x.status === Decision.Pending && !x.requires_confirmation).length : 0;
  const jobProblem = !!s.error && isJobTextCode(s.error.code);

  const end = useRef<HTMLDivElement>(null);
  const signature = `${s.status}|${!!s.jd}|${!!s.scoreBefore}|${s.suggestions.length}|${s.notes.length}|${s.asking}|${allDecided}`;
  useEffect(() => followLatest(end.current), [signature]);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 py-6 sm:px-5">
      {intro}

      {started && (
        <>
          {(s.jdText || s.jdUrl) && <JobBubble text={s.jdText} url={s.jdUrl} />}
          <RunCard
            steps={steps}
            onJump={s.status === SessionStatus.Finalized ? undefined : jumpToSection}
            footer={
              safeLeft > 0 ? (
                <button
                  type="button"
                  onClick={acceptAllSafe}
                  className="mt-1 ml-2 text-[12.5px] text-ink-muted underline underline-offset-4 hover:text-ink"
                >
                  Accept the {safeLeft} that only use what&apos;s already on your resume
                </button>
              ) : null
            }
            details={{
              read: s.jd ? (
                <div className="py-1">
                  <JdInsightsCard analysis={s.jd} activeReq={s.activeReq} onPick={highlightRequirement} />
                  <p className="mt-3 text-xs text-ink-muted">Pick a requirement to highlight the lines that address it.</p>
                </div>
              ) : undefined,
              score: <ScoreDetails />,
            }}
          />
          {s.warnings.map((w) => (
            <Say key={w}>{w}</Say>
          ))}

          {s.status === SessionStatus.Failed && s.error && (
            <div className="space-y-3">
              <Say tone={NoteTone.Error}>{s.error.message}</Say>
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
          {closing && s.status === SessionStatus.Ready && s.suggestions.length > 0 && s.notes.length === 0 && (
            <Say>Go through them below, or click any highlighted line on the resume. Finalize when you&apos;re happy.</Say>
          )}

          {s.notes.map((n) => (n.role === NoteRole.User ? <UserBubble key={n.id}>{n.text}</UserBubble> : <Say key={n.id} tone={n.tone}>{n.text}</Say>))}
          {s.asking && <Typing />}
          {allDecided && <Say>That&apos;s all of them reviewed. Finalize to save this version, or step back through any you want to change.</Say>}
          {s.status === SessionStatus.Finalized && <Say>This review is finalized. The saved version is in Resumes.</Say>}
        </>
      )}
      <div ref={end} />
    </div>
  );
}
