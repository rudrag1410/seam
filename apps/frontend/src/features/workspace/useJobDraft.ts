"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { clearDraft, loadDraft, saveDraft } from "../jd/draft";
import type { JobDraft } from "./JobComposer";
import { EMPTY_DRAFT } from "./run";

export function useJobDraft(composing: boolean, used: boolean): [JobDraft, Dispatch<SetStateAction<JobDraft>>] {
  const [draft, setDraft] = useState<JobDraft>(EMPTY_DRAFT);
  const restored = useRef(false);

  useEffect(() => {
    const saved = composing ? loadDraft() : null;
    if (saved) setDraft((d) => ({ ...d, ...saved }));
    restored.current = true;
  }, []);
  useEffect(() => {
    if (restored.current && composing) saveDraft({ text: draft.text, url: draft.url, byUrl: draft.byUrl });
  }, [draft.text, draft.url, draft.byUrl, composing]);
  useEffect(() => {
    if (!used) return;
    clearDraft();
    setDraft(EMPTY_DRAFT);
  }, [used]);

  return [draft, setDraft];
}
