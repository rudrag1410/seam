"use client";

import type { SuggestionOut } from "@seam/api-client";
import { cn } from "@seam/ui";
import { useMutation } from "@tanstack/react-query";
import { ArrowUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { api, unwrap } from "@/lib/api";
import { presentError } from "@/lib/errors";
import { useReview } from "../review/store";
import { canReword } from "./ReviewDock";

const QUICK = ["Shorter", "More technical", "Lead with the metric"];
const chip = "h-8 shrink-0 rounded-full border border-line bg-bg px-3.5 text-[13px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:pointer-events-none disabled:opacity-45";

/** Asks for a different wording of the suggestion under review. The request and the reply
 *  appear in the conversation, and the new wording replaces the old one on the resume. */
export function AskComposer({ sessionId }: { sessionId: string }) {
  const status = useReview((s) => s.status);
  const mode = useReview((s) => s.mode);
  const current = useReview((s) => s.suggestions.find((x) => x.id === s.cursor));
  const [text, setText] = useState("");

  const ask = useMutation({
    mutationFn: ({ id, instruction }: { id: string; instruction: string }) =>
      unwrap(
        api.POST("/v1/tailor-sessions/{session_id}/suggestions/{suggestion_id}/regenerate", {
          params: { path: { session_id: sessionId, suggestion_id: id } },
          body: { instruction },
        }),
      ),
    onMutate: ({ instruction }) => {
      const st = useReview.getState();
      st.say({ role: "user", text: instruction });
      st.patch({ asking: true });
      setText("");
    },
    onSuccess: (next) => {
      const st = useReview.getState();
      const wording = (x?: SuggestionOut) => String((x?.payload as { after?: string } | undefined)?.after ?? "");
      const changed = wording(st.suggestions.find((x) => x.id === next.id)) !== wording(next);
      st.replaceSuggestion(next);
      st.patch({ asking: false });
      st.say({
        role: "assistant",
        text: changed
          ? "Done. The new wording is on the resume, ready for you to accept or reject."
          : "I couldn't find a wording that fits that better, so the suggestion is unchanged.",
      });
    },
    onError: (e) => {
      const st = useReview.getState();
      st.patch({ asking: false });
      st.say({ role: "assistant", tone: "error", text: `${presentError(e).title} The suggestion is unchanged.` });
    },
  });

  const ready = status === "ready" && mode === "suggestions";
  const enabled = ready && !!current && canReword(current) && !ask.isPending;
  const send = (instruction: string) => {
    const value = instruction.trim();
    if (enabled && value.length > 1) ask.mutate({ id: current.id, instruction: value });
  };

  const placeholder =
    status === "queued" || status === "running"
      ? "Suggestions are still coming in…"
      : status === "failed"
        ? "Nothing to review yet"
        : status !== "ready"
          ? "This review is finalized"
        : mode !== "suggestions"
          ? "Switch to Suggestions to ask for changes"
          : !current
            ? "Select a change on the resume to ask about it"
            : canReword(current)
              ? "Ask for a different wording of this suggestion…"
              : "This kind of change can only be accepted or rejected";

  return (
    <div className="space-y-2.5">
      {ready && (
        <div className="hidden flex-wrap gap-2 sm:flex">
          {QUICK.map((q) => (
            <button key={q} type="button" disabled={!enabled} onClick={() => send(q)} className={chip}>
              {q}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className={cn(
          "flex h-12 items-center gap-2 rounded-full border border-line-strong bg-bg pr-1.5 pl-5 transition-colors focus-within:border-ink",
          !enabled && "bg-panel",
        )}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!enabled}
          placeholder={placeholder}
          aria-label="Ask for a change"
          className="h-full min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-ink-muted disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!enabled || text.trim().length < 2}
          aria-label="Send"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-on-ink transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          {ask.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </button>
      </form>
    </div>
  );
}
