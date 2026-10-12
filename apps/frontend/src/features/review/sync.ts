"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { listen } from "@/lib/dom";
import { API_URL } from "@/lib/env";
import { clearDirty } from "./actions";
import { useReview } from "./store";

const DEBOUNCE_MS = 600;
const MAX_BACKOFF_MS = 15_000;

/** The decisions for these suggestions, as the API takes them. */
function decisionsFor(ids: string[]) {
  const { suggestions } = useReview.getState();
  return ids.flatMap((id) => {
    const s = suggestions.find((x) => x.id === id);
    return s ? [{ id, status: s.status, edited_text: s.edited_text ?? null }] : [];
  });
}

function dirtyIds(): string[] {
  return [...useReview.getState().dirty];
}

function saveDecisions(sessionId: string, ids: string[]) {
  return api.PATCH("/v1/tailor-sessions/{session_id}/suggestions", {
    params: { path: { session_id: sessionId } },
    body: { decisions: decisionsFor(ids) },
  });
}

/** Optimistic decisions: the UI updates instantly and changes are saved as one batched request
 *  shortly after, retried with a growing delay if the save fails. */
class DecisionSync {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private saving = false;
  private failures = 0;
  private unsubscribe: Array<() => void> = [];

  constructor(private readonly sessionId: string) {}

  /** Starts watching for decisions and returns the function that stops, saving what is left. */
  start(): () => void {
    this.unsubscribe = [
      useReview.subscribe((s, prev) => {
        if (s.dirty.size && s.dirty !== prev.dirty) this.schedule(DEBOUNCE_MS);
      }),
      listen("pagehide", this.saveOnLeave),
    ];
    return this.stop;
  }

  private schedule(delay: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(this.flush, delay);
  }

  private readonly flush = async (): Promise<void> => {
    const ids = dirtyIds();
    if (!ids.length || this.saving) return;
    this.saving = true;
    const res = await saveDecisions(this.sessionId, ids).catch(() => null);
    this.saving = false;
    if (res?.response.ok) {
      this.failures = 0;
      clearDirty(ids);
      if (dirtyIds().length) this.schedule(DEBOUNCE_MS);
      return;
    }
    this.failures += 1;
    if (this.failures === 1) toast.error("Couldn't save your last decision. Retrying…");
    this.schedule(Math.min(1000 * 2 ** this.failures, MAX_BACKOFF_MS));
  };

  /** Last chance on unload: keepalive lets the request finish after the page is gone. */
  private readonly saveOnLeave = (): void => {
    const ids = dirtyIds();
    if (!ids.length) return;
    void fetch(`${API_URL}/v1/tailor-sessions/${this.sessionId}/suggestions`, {
      method: "PATCH",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisions: decisionsFor(ids) }),
    });
  };

  private readonly stop = (): void => {
    for (const off of this.unsubscribe) off();
    clearTimeout(this.timer);
    void this.flush();
  };
}

export function useDecisionSync(sessionId: string | null) {
  useEffect(() => (sessionId ? new DecisionSync(sessionId).start() : undefined), [sessionId]);
}

/** Resolves once every local decision has reached the server. */
export async function flushDecisions(sessionId: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const ids = dirtyIds();
    if (!ids.length) return;
    const res = await saveDecisions(sessionId, ids);
    if (res.response.ok) clearDirty(ids);
    else await new Promise((resolve) => setTimeout(resolve, 400));
  }
}
