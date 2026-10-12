"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/env";
import { useReview } from "./store";

const DEBOUNCE_MS = 600;

function payload(ids: string[]) {
  const { suggestions } = useReview.getState();
  return ids.flatMap((id) => {
    const s = suggestions.find((x) => x.id === id);
    return s ? [{ id, status: s.status, edited_text: s.edited_text ?? null }] : [];
  });
}

/** Optimistic decisions: the UI updates instantly, and changes flush as one batched PATCH. */
export function useDecisionSync(sessionId: string) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inflight = false;
    let failures = 0;

    async function flush() {
      const ids = [...useReview.getState().dirty];
      if (!ids.length || inflight) return;
      inflight = true;
      const res = await api
        .PATCH("/v1/tailor-sessions/{session_id}/suggestions", {
          params: { path: { session_id: sessionId } },
          body: { decisions: payload(ids) },
        })
        .catch(() => null);
      inflight = false;
      if (res?.response.ok) {
        failures = 0;
        useReview.getState().clearDirty(ids);
        if (useReview.getState().dirty.size) schedule();
      } else {
        failures += 1;
        if (failures === 1) toast.error("Couldn't save your last decision. Retrying…");
        timer = setTimeout(flush, Math.min(1000 * 2 ** failures, 15000));
      }
    }
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    };

    const unsub = useReview.subscribe((s, prev) => {
      if (s.dirty.size && s.dirty !== prev.dirty) schedule();
    });
    // last chance on unload: keepalive lets the PATCH finish after the page is gone
    const onHide = () => {
      const ids = [...useReview.getState().dirty];
      if (!ids.length) return;
      void fetch(`${API_URL}/v1/tailor-sessions/${sessionId}/suggestions`, {
        method: "PATCH", credentials: "include", keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisions: payload(ids) }),
      });
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      unsub();
      clearTimeout(timer);
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [sessionId]);
}

/** Resolves once every local decision has reached the server. */
export async function flushDecisions(sessionId: string): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const ids = [...useReview.getState().dirty];
    if (!ids.length) return;
    const res = await api.PATCH("/v1/tailor-sessions/{session_id}/suggestions", {
      params: { path: { session_id: sessionId } },
      body: { decisions: payload(ids) },
    });
    if (res.response.ok) useReview.getState().clearDirty(ids);
    else await new Promise((r) => setTimeout(r, 400));
  }
}
