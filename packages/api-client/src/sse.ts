export interface StreamHandlers {
  onEvent: (event: string, data: unknown) => void;
  onReconnecting?: () => void;
  onOpen?: () => void;
  /** The connection was refused or ended for good. EventSource hides the status, so the caller
   *  should probe the API to find out why (an expired session, usually). */
  onClosed?: () => void;
}

/** EventSource wrapper. The browser resends Last-Event-ID on reconnect, so the server resumes
 *  exactly where the stream left off. Returns a close function. */
export function openStream(
  url: string,
  events: readonly string[],
  handlers: StreamHandlers,
): () => void {
  const source = new EventSource(url, { withCredentials: true });
  source.onopen = () => handlers.onOpen?.();
  source.onerror = () => {
    if (source.readyState === EventSource.CONNECTING) handlers.onReconnecting?.();
    else if (source.readyState === EventSource.CLOSED) handlers.onClosed?.();
  };
  for (const name of events) {
    source.addEventListener(name, (e) => {
      // a dropped connection also fires "error", but as a plain event with nothing to parse
      const raw = (e as MessageEvent<string>).data;
      if (typeof raw !== "string") return;
      handlers.onEvent(name, JSON.parse(raw));
      if (name === "done" || name === "error") source.close();
    });
  }
  return () => source.close();
}

/** POST + SSE (EventSource only does GET), for streamed generations such as cover letters. */
export async function postStream(
  url: string,
  body: unknown,
  onEvent: (event: string, data: unknown) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => null)) as { error?: unknown } | null;
    onEvent("error", err?.error ?? { code: "UNKNOWN", message: "Something went wrong." });
    return;
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const event = /^event: (.+)$/m.exec(frame)?.[1];
      const data = /^data: (.+)$/m.exec(frame)?.[1];
      if (event && data) onEvent(event, JSON.parse(data));
    }
  }
}
