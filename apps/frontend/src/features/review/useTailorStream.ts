"use client";

import type { FitCheck, JDAnalysis, MatchScore, SuggestionOut } from "@seam/api-client";
import { openStream } from "@seam/api-client";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/env";
import { useReview } from "./store";

/** Subscribes to the session's SSE stream while it is generating. The browser reconnects with
 *  Last-Event-ID, and addSuggestion is idempotent, so a refresh mid-run loses nothing. */
export function useTailorStream(sessionId: string, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { patch, addSuggestion } = useReview.getState();
    const close = openStream(
      `${API_URL}/v1/tailor-sessions/${sessionId}/stream`,
      ["stage", "jd", "score", "suggestion", "warning", "done", "error"],
      {
        onOpen: () => patch({ reconnecting: false }),
        onReconnecting: () => patch({ reconnecting: true }),
        // a refused stream looks identical to a network drop; asking the API tells them apart
        // (an expired session answers 401, which signs the user out)
        onClosed: () => {
          void api.GET("/v1/me");
        },
        onEvent: (event, raw) => {
          const data = raw as Record<string, unknown>;
          switch (event) {
            case "stage": {
              // the plan arrives first; a replayed stream sends it again, which restarts the count
              if (data.tasks) patch({ status: "running", tasks: data.tasks as Record<string, number>, tasksDone: {} });
              else if (data.section) {
                const done = useReview.getState().tasksDone;
                const section = String(data.section);
                patch({ status: "running", tasksDone: { ...done, [section]: (done[section] ?? 0) + 1 } });
              } else patch({ status: "running" });
              break;
            }
            case "jd":
              patch({
                jd: data.analysis as JDAnalysis,
                fit: data.fit as FitCheck,
                title: [data.title, data.company].filter(Boolean).join(" · "),
              });
              break;
            case "score":
              patch({
                scoreBefore: data.before as MatchScore,
                ...(data.projected ? { scoreProjected: data.projected as MatchScore } : {}),
              });
              break;
            case "suggestion":
              addSuggestion(data as unknown as SuggestionOut);
              break;
            case "warning":
              if (data.code === "DEGRADED_CHECKS") patch({ degraded: true });
              else patch({ warnings: [...useReview.getState().warnings, String(data.message)] });
              break;
            case "done":
              patch({ status: "ready", degraded: useReview.getState().degraded || Boolean(data.degraded) });
              break;
            case "error":
              patch({
                status: "failed",
                error: { code: String(data.code), message: String(data.message), retryable: Boolean(data.retryable) },
              });
          }
        },
      },
    );
    return close;
  }, [sessionId, active]);
}
