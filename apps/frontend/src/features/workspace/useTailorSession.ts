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
import {
  NEW_RUN_PATH,
  createBody,
  isRunning,
  retryBody,
  runFromDraft,
  runFromSession,
  sessionPath,
  showAddress,
} from "./run";

function fetchSession(id: string) {
  return unwrap(
    api.GET("/v1/tailor-sessions/{session_id}", { params: { path: { session_id: id } } }),
  );
}

function fetchVersion(id: string) {
  return unwrap(api.GET("/v1/versions/{version_id}", { params: { path: { version_id: id } } }));
}

function createSession(body: TailorCreate) {
  return unwrap(api.POST("/v1/tailor-sessions", { body }));
}

async function finalizeSession(id: string) {
  await flushDecisions(id);
  return unwrap(
    api.POST("/v1/tailor-sessions/{session_id}/finalize", { params: { path: { session_id: id } } }),
  );
}

function reportError(error: unknown): void {
  toast.error(presentError(error).title);
}

export function useTailorSession(
  initialSessionId: string | undefined,
  baseVersionId: string | null,
) {
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
    staleTime: Infinity,
    gcTime: 0,
  });

  useEffect(() => {
    if (query.data) hydrate(query.data);
  }, [query.data]);
  useEffect(() => reset, []);
  useEffect(() => {
    if (path !== NEW_RUN_PATH || initialSessionId || !useReview.getState().sessionId) return;
    reset();
    setSessionId(null);
  }, [path, initialSessionId]);

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
      showAddress(sessionPath(id));
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

  const baseResume = (baseVersionId ? baseVersion.data?.document : primary.data?.document) ?? null;
  return {
    sessionId,
    setSessionId,
    fault,
    setFault,
    primary,
    query,
    create,
    finalize,
    baseResume,
    loadingResume: primary.isPending || baseVersion.isPending,
    baseVersionId,
  };
}

export type TailorSession = ReturnType<typeof useTailorSession>;

export function startRun(session: TailorSession, draft: JobDraft): void {
  const resume = session.primary.data;
  if (!resume || !session.baseResume) return;
  session.setFault(null);
  begin(runFromDraft(draft, session.baseResume));
  session.create.mutate(createBody(draft, resume.id, session.baseVersionId));
}

export function retryRun(session: TailorSession): void {
  const prev = session.query.data;
  if (!prev) return;
  begin(runFromSession(prev));
  session.setSessionId(null);
  session.create.mutate(retryBody(prev));
}

export function abandonRun(session: TailorSession): void {
  reset();
  session.setSessionId(null);
  showAddress(NEW_RUN_PATH);
}
