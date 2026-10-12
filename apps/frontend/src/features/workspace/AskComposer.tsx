"use client";

import { SessionStatus, type SuggestionOut } from "@seam/api-client";
import { cn } from "@seam/ui";
import { useMutation } from "@tanstack/react-query";
import { ArrowUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { api, unwrap } from "@/lib/api";
import { presentError } from "@/lib/errors";
import { replaceSuggestion, say } from "../review/actions";
import { NoteRole, NoteTone, type ReviewState, useReview } from "../review/store";
import { ViewMode } from "../resume-canvas/view-model";
import { canReword } from "./ReviewDock";

const QUICK = ["Shorter", "More technical", "Lead with the metric"];
const chip = "h-8 shrink-0 rounded-full border border-line bg-bg px-3.5 text-[13px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:pointer-events-none disabled:opacity-45";

interface Ask {
  id: string;
  instruction: string;
}

function requestRewrite(sessionId: string, { id, instruction }: Ask) {
  return unwrap(
    api.POST("/v1/tailor-sessions/{session_id}/suggestions/{suggestion_id}/regenerate", {
      params: { path: { session_id: sessionId, suggestion_id: id } },
      body: { instruction },
    }),
  );
}

function wording(s?: SuggestionOut): string {
  return String((s?.payload as { after?: string } | undefined)?.after ?? "");
}

function onAsked({ instruction }: Ask): void {
  say({ role: NoteRole.User, text: instruction });
  useReview.setState({ asking: true });
}

function onRewritten(next: SuggestionOut): void {
  const before = useReview.getState().suggestions.find((x) => x.id === next.id);
  const changed = wording(before) !== wording(next);
  replaceSuggestion(next);
  useReview.setState({ asking: false });
  say({
    role: NoteRole.Assistant,
    text: changed
      ? "Done. The new wording is on the resume, ready for you to accept or reject."
      : "I couldn't find a wording that fits that better, so the suggestion is unchanged.",
  });
}

function onAskFailed(error: unknown): void {
  useReview.setState({ asking: false });
  say({ role: NoteRole.Assistant, tone: NoteTone.Error, text: `${presentError(error).title} The suggestion is unchanged.` });
}

function placeholderFor(status: ReviewState["status"], mode: ReviewState["mode"], current?: SuggestionOut): string {
  if (status === SessionStatus.Queued || status === SessionStatus.Running) return "Suggestions are still coming in…";
  if (status === SessionStatus.Failed) return "Nothing to review yet";
  if (status !== SessionStatus.Ready) return "This review is finalized";
  if (mode !== ViewMode.Suggestions) return "Switch to Suggestions to ask for changes";
  if (!current) return "Select a change on the resume to ask about it";
  return canReword(current) ? "Ask for a different wording of this suggestion…" : "This kind of change can only be accepted or rejected";
}

interface AskComposerProps {
  sessionId: string;
}

export function AskComposer({ sessionId }: AskComposerProps) {
  const status = useReview((s) => s.status);
  const mode = useReview((s) => s.mode);
  const current = useReview((s) => s.suggestions.find((x) => x.id === s.cursor));
  const [text, setText] = useState("");

  const ask = useMutation({
    mutationFn: (request: Ask) => requestRewrite(sessionId, request),
    onMutate: onAsked,
    onSuccess: onRewritten,
    onError: onAskFailed,
  });

  const ready = status === SessionStatus.Ready && mode === ViewMode.Suggestions;
  const enabled = ready && !!current && canReword(current) && !ask.isPending;

  const placeholder = placeholderFor(status, mode, current);

  return (
    <div className="space-y-2.5">
      {ready && (
        <div className="hidden flex-wrap gap-2 sm:flex">
          {QUICK.map((q) => (
            <button key={q} type="button" disabled={!enabled} onClick={() => current && ask.mutate({ id: current.id, instruction: q })} className={chip}>
              {q}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!enabled || text.trim().length < 2) return;
          ask.mutate({ id: current.id, instruction: text.trim() });
          setText("");
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
