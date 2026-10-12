import { ApiException, UNKNOWN_FAILURE } from "./client";
import { StreamEvent } from "./schema";
import type {
  ChunkData,
  DoneData,
  ErrorData,
  ErrorEnvelope,
  JobData,
  LetterSavedData,
  ScoreData,
  StageData,
  SuggestionOut,
  WarningData,
} from "./types";

export interface TailorEventPayloads {
  [StreamEvent.Stage]: StageData;
  [StreamEvent.Jd]: JobData;
  [StreamEvent.Score]: ScoreData;
  [StreamEvent.Suggestion]: SuggestionOut;
  [StreamEvent.Warning]: WarningData;
  [StreamEvent.Done]: DoneData;
  [StreamEvent.Error]: ErrorData;
}

export interface LetterEventPayloads {
  [StreamEvent.Chunk]: ChunkData;
  [StreamEvent.Done]: LetterSavedData;
  [StreamEvent.Error]: ErrorData;
}

export type EventHandlers<Payloads> = { [E in keyof Payloads]?: (data: Payloads[E]) => void };

export interface ConnectionCallbacks {
  onReconnecting?: () => void;
  onOpen?: () => void;
  onClosed?: () => void;
}

function eventNames<Payloads>(handlers: EventHandlers<Payloads>): StreamEvent[] {
  return Object.keys(handlers) as StreamEvent[];
}

function isFinal(event: StreamEvent): boolean {
  return event === StreamEvent.Done || event === StreamEvent.Error;
}

export function openStream<Payloads>(
  url: string,
  handlers: EventHandlers<Payloads>,
  connection: ConnectionCallbacks = {},
): () => void {
  const source = new EventSource(url, { withCredentials: true });
  source.onopen = () => connection.onOpen?.();
  source.onerror = () => {
    if (source.readyState === EventSource.CONNECTING) connection.onReconnecting?.();
    else if (source.readyState === EventSource.CLOSED) connection.onClosed?.();
  };
  for (const name of eventNames(handlers)) {
    source.addEventListener(name, (e) => {
      const raw = (e as MessageEvent<string>).data;
      if (typeof raw !== "string") return;
      (handlers[name as keyof Payloads] as ((data: unknown) => void) | undefined)?.(
        JSON.parse(raw),
      );
      if (isFinal(name)) source.close();
    });
  }
  return () => source.close();
}

const FRAME_EVENT = /^event: (.+)$/m;
const FRAME_DATA = /^data: (.+)$/m;

function dispatchFrame<Payloads>(frame: string, handlers: EventHandlers<Payloads>): void {
  const event = FRAME_EVENT.exec(frame)?.[1] as keyof Payloads | undefined;
  const data = FRAME_DATA.exec(frame)?.[1];
  if (event && data)
    (handlers[event] as ((payload: unknown) => void) | undefined)?.(JSON.parse(data));
}

export async function postStream<Payloads extends { [StreamEvent.Error]: ErrorData }>(
  url: string,
  body: unknown,
  handlers: EventHandlers<Payloads>,
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
    const envelope = (await res.json().catch(() => null)) as ErrorEnvelope | null;
    if (!envelope) throw new ApiException(res.status, UNKNOWN_FAILURE);
    handlers[StreamEvent.Error]?.(envelope.error);
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
    for (const frame of frames) dispatchFrame(frame, handlers);
  }
}
