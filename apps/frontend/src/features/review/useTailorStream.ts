"use client";

import {
  type DoneData,
  type ErrorData,
  type EventHandlers,
  type JobData,
  type ScoreData,
  type StageData,
  type SuggestionOut,
  type TailorEventPayloads,
  SessionStatus,
  StreamEvent,
  type WarningData,
  WarningCode,
  openStream,
} from "@seam/api-client";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/env";
import { addSuggestion } from "./actions";
import { useReview } from "./store";

function onStage(data: StageData): void {
  if (data.tasks) {
    useReview.setState({ status: SessionStatus.Running, tasks: data.tasks, tasksDone: {} });
  } else if (data.section) {
    const done = useReview.getState().tasksDone;
    useReview.setState({
      status: SessionStatus.Running,
      tasksDone: { ...done, [data.section]: (done[data.section] ?? 0) + 1 },
    });
  } else {
    useReview.setState({ status: SessionStatus.Running });
  }
}

function onJob(data: JobData): void {
  useReview.setState({
    jd: data.analysis,
    fit: data.fit,
    title: [data.title, data.company].filter(Boolean).join(" · "),
  });
}

function onScore(data: ScoreData): void {
  useReview.setState({
    scoreBefore: data.before,
    ...(data.projected ? { scoreProjected: data.projected } : {}),
  });
}

function onSuggestion(data: SuggestionOut): void {
  addSuggestion(data);
}

function onWarning(data: WarningData): void {
  if (data.code === WarningCode.DegradedChecks) useReview.setState({ degraded: true });
  else useReview.setState({ warnings: [...useReview.getState().warnings, data.message] });
}

function onDone(data: DoneData): void {
  useReview.setState({
    status: SessionStatus.Ready,
    degraded: useReview.getState().degraded || data.degraded,
  });
}

function onError(data: ErrorData): void {
  useReview.setState({
    status: SessionStatus.Failed,
    error: { code: data.code, message: data.message, retryable: data.retryable },
  });
}

const HANDLERS: EventHandlers<TailorEventPayloads> = {
  [StreamEvent.Stage]: onStage,
  [StreamEvent.Jd]: onJob,
  [StreamEvent.Score]: onScore,
  [StreamEvent.Suggestion]: onSuggestion,
  [StreamEvent.Warning]: onWarning,
  [StreamEvent.Done]: onDone,
  [StreamEvent.Error]: onError,
};

function onOpen(): void {
  useReview.setState({ reconnecting: false });
}

function onReconnecting(): void {
  useReview.setState({ reconnecting: true });
}

function onClosed(): void {
  void api.GET("/v1/me");
}

function follow(sessionId: string): () => void {
  return openStream(`${API_URL}/v1/tailor-sessions/${sessionId}/stream`, HANDLERS, {
    onOpen,
    onReconnecting,
    onClosed,
  });
}

export function useTailorStream(sessionId: string | null, active: boolean) {
  useEffect(() => (sessionId && active ? follow(sessionId) : undefined), [sessionId, active]);
}
