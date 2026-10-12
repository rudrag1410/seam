"use client";

import type { CoverLetterOut } from "@seam/api-client";
import { postStream } from "@seam/api-client";
import { Button, Checkbox, Segmented, Textarea } from "@seam/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api";
import { downloadText } from "@/lib/dom";
import { API_URL } from "@/lib/env";
import { handleUnauthorized } from "@/lib/session";

type Tone = "professional" | "warm" | "direct";

interface LetterOptions {
  tone: Tone;
  length: "short" | "standard";
  include_notice_period: boolean;
}

interface LetterHandlers {
  onText: (chunk: string) => void;
  onSaved: () => void;
}

function onLetterEvent(event: string, data: unknown, handlers: LetterHandlers): void {
  if (event === "chunk") handlers.onText((data as { text: string }).text);
  if (event === "done") handlers.onSaved();
  if (event === "error") {
    const err = data as { code?: string; message: string };
    if (err.code === "UNAUTHORIZED") handleUnauthorized();
    else toast.error(err.message);
  }
}

/** Streams a new letter from the API. Resolves when the stream ends, however it ends. */
async function writeLetter(versionId: string, options: LetterOptions, signal: AbortSignal, handlers: LetterHandlers): Promise<void> {
  try {
    await postStream(`${API_URL}/v1/versions/${versionId}/cover-letter`, options, (event, data) => onLetterEvent(event, data, handlers), signal);
  } catch {
    toast.error("Couldn't generate the cover letter. Try again.");
  }
}

export function CoverLetterPanel({ versionId }: { versionId: string }) {
  const qc = useQueryClient();
  const [tone, setTone] = useState<Tone>("professional");
  const [length, setLength] = useState<"short" | "standard">("standard");
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
          options={[{ value: "professional", label: "Professional" }, { value: "warm", label: "Warm" }, { value: "direct", label: "Direct" }]} />
        <Segmented size="sm" aria-label="Length" value={length} onChange={setLength}
          options={[{ value: "short", label: "Short" }, { value: "standard", label: "Standard" }]} />
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
