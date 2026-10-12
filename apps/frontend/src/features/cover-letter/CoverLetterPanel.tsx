"use client";

import { type CoverLetterOut, ErrorCode, type ErrorData, type EventHandlers, LetterLength, type LetterEventPayloads, StreamEvent, Tone, postStream } from "@seam/api-client";
import { Button, Checkbox, Segmented, Textarea } from "@seam/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api";
import { downloadText } from "@/lib/dom";
import { API_URL } from "@/lib/env";
import { handleUnauthorized } from "@/lib/session";

const TONES = [
  { value: Tone.Professional, label: "Professional" },
  { value: Tone.Warm, label: "Warm" },
  { value: Tone.Direct, label: "Direct" },
];

const LENGTHS = [
  { value: LetterLength.Short, label: "Short" },
  { value: LetterLength.Standard, label: "Standard" },
];

interface LetterOptions {
  tone: Tone;
  length: LetterLength;
  include_notice_period: boolean;
}

interface LetterHandlers {
  onText: (chunk: string) => void;
  onSaved: () => void;
}

function onLetterError(err: ErrorData): void {
  if (err.code === ErrorCode.Unauthorized) handleUnauthorized();
  else toast.error(err.message);
}

/** One handler per event of a streamed letter, each checked against that event's payload. */
function letterHandlers(handlers: LetterHandlers): EventHandlers<LetterEventPayloads> {
  return {
    [StreamEvent.Chunk]: (data) => handlers.onText(data.text),
    [StreamEvent.Done]: () => handlers.onSaved(),
    [StreamEvent.Error]: onLetterError,
  };
}

/** Streams a new letter from the API. Resolves when the stream ends, however it ends. */
async function writeLetter(versionId: string, options: LetterOptions, signal: AbortSignal, handlers: LetterHandlers): Promise<void> {
  try {
    await postStream(`${API_URL}/v1/versions/${versionId}/cover-letter`, options, letterHandlers(handlers), signal);
  } catch {
    toast.error("Couldn't generate the cover letter. Try again.");
  }
}

interface CoverLetterPanelProps {
  versionId: string;
}

export function CoverLetterPanel({ versionId }: CoverLetterPanelProps) {
  const qc = useQueryClient();
  const [tone, setTone] = useState<Tone>(Tone.Professional);
  const [length, setLength] = useState<LetterLength>(LetterLength.Standard);
  const [notice, setNotice] = useState(false);
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const saved = useQuery({
    queryKey: ["cover-letters", versionId],
    queryFn: () => unwrap(api.GET("/v1/versions/{version_id}/cover-letters", { params: { path: { version_id: versionId } } })),
  });
  const latest: CoverLetterOut | undefined = saved.data?.[0];
  useEffect(() => { if (latest && !text && !streaming) setText(latest.body); }, [latest]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => abort.current?.abort(), []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented size="sm" aria-label="Tone" value={tone} onChange={setTone}
          options={TONES} />
        <Segmented size="sm" aria-label="Length" value={length} onChange={setLength}
          options={LENGTHS} />
      </div>
      <Checkbox checked={notice} onChange={setNotice} label="Mention my notice period" />
      <Button
        loading={streaming}
        onClick={async () => {
          abort.current?.abort();
          abort.current = new AbortController();
          setText("");
          setStreaming(true);
          await writeLetter(versionId, { tone, length, include_notice_period: notice }, abort.current.signal, {
            onText: (chunk) => setText((t) => t + chunk),
            onSaved: () => qc.invalidateQueries({ queryKey: ["cover-letters", versionId] }),
          });
          setStreaming(false);
        }}
      ><Sparkles className="size-4" /> {text ? "Regenerate" : "Write cover letter"}</Button>
      {(text || streaming) && (
        <>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} aria-label="Cover letter" className="font-serif text-[14px] leading-relaxed" />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Copied"))}><Copy className="size-3.5" /> Copy</Button>
            <Button size="sm" variant="secondary" onClick={() => downloadText(text, "cover-letter.txt")}><Download className="size-3.5" /> Download</Button>
          </div>
        </>
      )}
    </div>
  );
}
