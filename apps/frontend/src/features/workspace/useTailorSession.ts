"use client";

import { SessionStatus, type TailorCreate } from "@seam/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { begin, hydrate, reset } from "@/features/review/actions";
import { useReview } from "@/features/review/store";
import { flushDecisions, useDecisionSync } from "@/features/review/sync";
import { useTailorStream } from "@/features/review/useTailorStream";
import { api, unwrap } from "@/lib/api";
import { presentError } from "@/lib/errors";
import { keys, usePrimaryResume } from "@/lib/queries";
import type { JobDraft } from "./JobComposer";
import { NEW_RUN_PATH, createBody, isRunning, retryBody, runFromDraft, runFromSession, sessionPath, showAddress } from "./run";

function fetchSession(id: string) {
  return unwrap(api.GET("/v1/tailor-sessions/{session_id}", { params: { path: { session_id: id } } }));
}

function fetchVersion(id: string) {
  return unwrap(api.GET("/v1/versions/{version_id}", { params: { path: { version_id: id } } }));
}

function createSession(body: TailorCreate) {
  return unwrap(api.POST("/v1/tailor-sessions", { body }));
}

/** Decisions are saved in the background, so make sure they have all landed before saving a version. */
async function finalizeSession(id: string) {
  await flushDecisions(id);
  return unwrap(api.POST("/v1/tailor-sessions/{session_id}/finalize", { params: { path: { session_id: id } } }));
}

function reportError(error: unknown): void {
  toast.error(presentError(error).title);
}

/** Owns one tailoring session from the screen's point of view: which session is open, loading
 *  it, following its stream, saving decisions, and the requests that start and finish a run. */
export function useTailorSession(initialSessionId: string | undefined, baseVersionId: string | null) {
  const router = useRouter();
  const path = usePathname();
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [fault, setFault] = useState<unknown>(null);

  const primary = usePrimaryResume(!sessionId);
  const baseVersion = useQuery({
    queryKey: keys.version(baseVersionId ?? ""),
    queryFn: () => fetchVersion(baseVersionId!),
    enabled: !!baseVersionId && !sessionId,
  });
  const query = useQuery({
    queryKey: keys.session(sessionId ?? ""),
    queryFn: () => fetchSession(sessionId!),
    enabled: !!sessionId,
    // decisions are saved separately, so a cached copy goes stale the moment one is made:
    // never refetch under the user, and never reuse a copy from an earlier visit
    staleTime: Infinity,
    gcTime: 0,
  });

  useEffect(() => {
    if (query.data) hydrate(query.data);
  }, [query.data]);
  useEffect(() => reset, []);
  // "New tailor" in the sidebar while a run started here is on screen: begin again
  useEffect(() => {
    if (path !== NEW_RUN_PATH || initialSessionId || !useReview.getState().sessionId) return;
    reset();
    setSessionId(null);
  }, [path, initialSessionId]);

  // a finished run adds an entry to the sidebar's recent list
  const finished = useReview((s) => s.status === SessionStatus.Ready);
  useEffect(() => {
    if (finished) qc.invalidateQueries({ queryKey: keys.recent });
  }, [finished, qc]);

  useTailorStream(sessionId, isRunning(query.data?.status));
  useDecisionSync(sessionId);

  const create = useMutation({
    mutationFn: createSession,
    onSuccess: ({ id }) => {
      useReview.setState({ sessionId: id });
      setSessionId(id);
      showAddress(sessionPath(id)); // a refresh or a shared link lands on this session
      qc.invalidateQueries({ queryKey: keys.recent });
    },
    onError: (error) => {
      reset();
      setSessionId(null);
      setFault(error);
    },
  });
  const finalize = useMutation({
    mutationFn: finalizeSession,
    onSuccess: ({ version_id }) => {
      qc.invalidateQueries({ queryKey: keys.versions });
      qc.invalidateQueries({ queryKey: keys.recent });
      router.push(`/resumes/${version_id}`);
    },
    onError: reportError,
  });

  // what the paper shows before a run has loaded its own copy
  const baseResume = (baseVersionId ? baseVersion.data?.document : primary.data?.document) ?? null;
  return { sessionId, setSessionId, fault, setFault, primary, query, create, finalize, baseResume, loadingResume: primary.isPending || baseVersion.isPending, baseVersionId };
}

export type TailorSession = ReturnType<typeof useTailorSession>;

/** Sends the job description: the conversation shows it at once, and the request follows. */
export function startRun(session: TailorSession, draft: JobDraft): void {
  const resume = session.primary.data;
  if (!resume || !session.baseResume) return;
  session.setFault(null);
  begin(runFromDraft(draft, session.baseResume));
  session.create.mutate(createBody(draft, resume.id, session.baseVersionId));
}

/** Runs the same resume and job again after a failure. */
export function retryRun(session: TailorSession): void {
  const prev = session.query.data;
  if (!prev) return;
  begin(runFromSession(prev));
  session.setSessionId(null);
  session.create.mutate(retryBody(prev));
}

/** Leaves a run that can't continue and goes back to an empty composer at the starting address. */
export function abandonRun(session: TailorSession): void {
  reset();
  session.setSessionId(null);
  showAddress(NEW_RUN_PATH);
}
