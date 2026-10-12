"use client";

import type { TailorCreate } from "@seam/api-client";
import { Button } from "@seam/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/feedback/states";
import { clearDraft, loadDraft, saveDraft } from "@/features/jd/draft";
import { ResumeCanvas } from "@/features/resume-canvas/ResumeCanvas";
import { buildView } from "@/features/resume-canvas/view-model";
import { useReview } from "@/features/review/store";
import { flushDecisions, useDecisionSync } from "@/features/review/sync";
import { useReviewKeys } from "@/features/review/useReviewKeys";
import { useTailorStream } from "@/features/review/useTailorStream";
import { Dropzone, ResumeCard } from "@/features/upload/Dropzone";
import { ApiException, api, unwrap } from "@/lib/api";
import { presentError } from "@/lib/errors";
import { keys, useMe, usePrimaryResume } from "@/lib/queries";
import { AskComposer } from "./AskComposer";
import { JobComposer, type JobDraft } from "./JobComposer";
import { ReviewDock } from "./ReviewDock";
import { buildSteps } from "./steps";
import { Say, Thread } from "./Thread";
import { ModeSwitch, WorkspaceHeader } from "./WorkspaceHeader";
import { PaperSkeleton, WorkspaceSkeleton } from "./WorkspaceSkeleton";

const NEW_PATH = "/tailor/new";
const EMPTY: JobDraft = { text: "", url: "", byUrl: false, sections: ["summary", "skills", "experience"], intensity: "balanced" };


/** One screen for the whole job: the job description goes in on the left, the run streams into
 *  the same conversation, and the resume on the right picks up suggestions as they arrive.
 *  Starting a run changes the address but never swaps the screen. */
export function TailorWorkspace({ initialSessionId, baseVersionId }: { initialSessionId?: string; baseVersionId?: string | null }) {
  const router = useRouter();
  const path = usePathname();
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [draft, setDraft] = useState<JobDraft>(EMPTY);
  const [replacing, setReplacing] = useState(false);
  const [fault, setFault] = useState<unknown>(null);
  const paper = useRef<HTMLDivElement>(null);

  const s = useReview();
  const started = s.status !== "loading";
  const composing = !sessionId && !started;

  const me = useMe();
  const primary = usePrimaryResume(!sessionId);
  const baseVersion = useQuery({
    queryKey: keys.version(baseVersionId ?? ""),
    queryFn: () => unwrap(api.GET("/v1/versions/{version_id}", { params: { path: { version_id: baseVersionId! } } })),
    enabled: !!baseVersionId && !sessionId,
  });
  const query = useQuery({
    queryKey: keys.session(sessionId ?? ""),
    queryFn: () => unwrap(api.GET("/v1/tailor-sessions/{session_id}", { params: { path: { session_id: sessionId! } } })),
    enabled: !!sessionId,
    // decisions are saved separately, so a cached copy goes stale the moment one is made:
    // never refetch under the user, and never reuse a copy from an earlier visit
    staleTime: Infinity,
    gcTime: 0,
  });

  useEffect(() => {
    if (query.data) useReview.getState().hydrate(query.data);
  }, [query.data]);
  useEffect(() => () => useReview.getState().reset(), []);

  // the pasted text survives a refresh until a run has actually used it
  const restored = useRef(false);
  useEffect(() => {
    const saved = initialSessionId ? null : loadDraft();
    if (saved) setDraft((d) => ({ ...d, ...saved }));
    restored.current = true;
  }, [initialSessionId]);
  useEffect(() => {
    if (restored.current && composing) saveDraft({ text: draft.text, url: draft.url, byUrl: draft.byUrl });
  }, [draft.text, draft.url, draft.byUrl, composing]);
  useEffect(() => {
    if (s.status === "ready" || s.status === "finalized") clearDraft();
  }, [s.status]);

  // "New tailor" in the sidebar while a run started here is on screen: begin again
  useEffect(() => {
    if (path === NEW_PATH && !initialSessionId && useReview.getState().sessionId) {
      useReview.getState().reset();
      setSessionId(null);
      setDraft(EMPTY);
    }
  }, [path, initialSessionId]);

  useTailorStream(sessionId ?? "", !!sessionId && !!query.data && (query.data.status === "queued" || query.data.status === "running"));
  useDecisionSync(sessionId ?? "");
  useReviewKeys(s.status === "ready");

  const create = useMutation({
    mutationFn: (body: TailorCreate) => unwrap(api.POST("/v1/tailor-sessions", { body })),
    onSuccess: ({ id }) => {
      useReview.getState().patch({ sessionId: id });
      setSessionId(id);
      // same screen, new address: a refresh or a shared link lands on this session
      window.history.replaceState(null, "", `/tailor/${id}`);
      qc.invalidateQueries({ queryKey: keys.sessions });
    },
    onError: (e) => {
      useReview.getState().reset();
      setSessionId(null);
      setFault(e);
    },
  });

  const doc = s.resume ?? (baseVersionId ? baseVersion.data?.document : primary.data?.document) ?? null;

  const send = () => {
    if (!primary.data || !doc) return;
    setFault(null);
    const byUrl = draft.byUrl;
    useReview.getState().begin({ resume: doc, jdText: byUrl ? "" : draft.text.trim(), jdUrl: byUrl ? draft.url.trim() : null, sections: draft.sections });
    create.mutate({
      resume_id: primary.data.id,
      ...(byUrl ? { jd_url: draft.url.trim() } : { jd_text: draft.text.trim() }),
      sections: draft.sections,
      intensity: draft.intensity,
      base_version_id: baseVersionId ?? null,
    });
  };

  const retry = () => {
    const prev = query.data;
    if (!prev) return;
    useReview.getState().begin({ resume: prev.resume, jdText: prev.jd_text, jdUrl: prev.jd_url, sections: prev.sections });
    setSessionId(null);
    create.mutate({ resume_id: prev.resume_id, jd_id: prev.jd_id, sections: prev.sections as never, intensity: prev.intensity as never });
  };

  const editJob = () => {
    const { jdText, jdUrl, sections } = useReview.getState();
    setDraft((d) => ({ ...d, text: jdText, url: jdUrl ?? "", byUrl: !jdText && !!jdUrl, sections: sections.length ? (sections as JobDraft["sections"]) : d.sections }));
    useReview.getState().reset();
    setSessionId(null);
    window.history.replaceState(null, "", NEW_PATH);
  };

  const finalize = useMutation({
    mutationFn: async () => {
      await flushDecisions(sessionId!);
      return unwrap(api.POST("/v1/tailor-sessions/{session_id}/finalize", { params: { path: { session_id: sessionId! } } }));
    },
    onSuccess: ({ version_id }) => {
      qc.invalidateQueries({ queryKey: keys.versions });
      qc.invalidateQueries({ queryKey: keys.recent });
      router.push(`/resumes/${version_id}`);
    },
    onError: (e) => toast.error(presentError(e).title),
  });

  const readOnly = s.status === "finalized";
  const reviewing = started && !readOnly && s.status !== "failed" && s.mode === "suggestions";
  const view = useMemo(() => (doc ? buildView(doc, s.suggestions, started ? s.mode : "original") : []), [doc, s.suggestions, s.mode, started]);
  const highlight = useMemo(
    () => new Set(s.activeReq ? s.suggestions.filter((x) => x.addresses.includes(s.activeReq!)).map((x) => x.id) : []),
    [s.activeReq, s.suggestions],
  );

  // sections the model is still writing for show a line of stitches on the paper too
  const busy = useMemo(
    () => new Set((buildSteps(s).find((x) => x.key === "write")?.parts ?? []).filter((p) => p.state === "running").map((p) => p.key)),
    [s],
  );

  // bring the change under review into view, but only when it is actually off screen, and never
  // for the selection a session opens with (that would yank the page before anyone has acted)
  const lastCursor = useRef<string | null>(null);
  useEffect(() => {
    const first = lastCursor.current === null;
    lastCursor.current = s.cursor;
    if (!s.cursor || !reviewing || first) return;
    const el = paper.current?.querySelector(`[data-anchor="${s.cursor}"]`);
    const box = paper.current?.getBoundingClientRect();
    if (!el || !box) return;
    const r = el.getBoundingClientRect();
    const top = Math.max(box.top, 0) + 24;
    const bottom = Math.min(box.bottom, window.innerHeight) - 24;
    if (r.top < top || r.bottom > bottom) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [s.cursor, reviewing]);

  if (initialSessionId && query.isError) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </div>
    );
  }
  // a session opened by its address has nothing to show until it loads
  if (!composing && !started) return <WorkspaceSkeleton />;

  const jobError = fault instanceof ApiException && /^(JD_|URL_)/.test(fault.error.code) ? [fault.error.message, fault.error.hint].filter(Boolean).join(" ") : null;
  const first = me.data?.full_name.split(" ")[0];

  const intro = (
    <>
      <Say>
        {first ? `Hi ${first}. ` : ""}
        {baseVersionId ? "You're branching from an earlier version. " : ""}
        Paste the job description for the role you want. I&apos;ll read it, score your resume against it, and suggest edits line by line. Nothing
        on your resume changes until you accept it.
      </Say>
      {composing &&
        (primary.isPending ? (
          <div className="h-[78px] animate-pulse rounded-[16px] bg-cream" aria-hidden />
        ) : primary.data && !replacing ? (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <ResumeCard resume={primary.data} />
            </div>
            <Button variant="secondary" size="sm" onClick={() => setReplacing(true)}>
              Replace
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Dropzone compact onUploaded={() => setReplacing(false)} />
            {replacing && (
              <Button variant="ghost" size="sm" onClick={() => setReplacing(false)}>
                Keep the current resume
              </Button>
            )}
          </div>
        ))}
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <WorkspaceHeader started={started} versionId={query.data?.version_id} onFinalize={() => finalize.mutate()} finalizing={finalize.isPending} />

      {/* One set of elements for both layouts. Wide: conversation and composer stacked on the
          left, paper on the right. Narrow: conversation, paper, then the composer pinned below. */}
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(380px,460px)_1fr] lg:grid-rows-[minmax(0,1fr)_auto]">
        <div data-thread className="scroll-thin border-line lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto lg:border-r">
          <Thread intro={intro} onRetry={retry} onEditJob={editJob} retrying={create.isPending} />
        </div>

        <div ref={paper} className="scroll-thin bg-cream/40 px-3 py-6 sm:px-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto">
          {started && (
            <div className="mx-auto mb-4 flex max-w-[794px] md:hidden">
              <ModeSwitch />
            </div>
          )}
          {doc ? (
            <ResumeCanvas
              contact={doc.contact}
              view={view}
              cursor={reviewing ? s.cursor : null}
              highlight={highlight}
              onSelect={reviewing ? s.setCursor : undefined}
              busy={busy}
            />
          ) : primary.isPending || baseVersion.isPending ? (
            <PaperSkeleton />
          ) : (
            <div className="mx-auto grid h-64 max-w-[794px] place-items-center border border-dashed border-line-strong text-sm text-ink-muted">
              Your resume will appear here once it&apos;s uploaded.
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 space-y-3 border-t border-line bg-bg px-4 py-3 sm:px-5 lg:static lg:col-start-1 lg:row-start-2 lg:border-r">
          <div className="mx-auto w-full max-w-[600px] space-y-3">
            {composing ? (
              <>
                {!!fault && !jobError && <ErrorState error={fault} onRetry={send} />}
                <JobComposer
                  draft={draft}
                  onChange={(patch) => {
                    setFault(null);
                    setDraft((d) => ({ ...d, ...patch }));
                  }}
                  onSend={send}
                  sending={create.isPending}
                  disabledReason={!primary.data && !primary.isPending ? "Upload your resume first." : undefined}
                  error={jobError}
                />
              </>
            ) : (
              <>
                {reviewing && <ReviewDock />}
                <AskComposer sessionId={sessionId ?? ""} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
