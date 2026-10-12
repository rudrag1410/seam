"use client";

import { type RefObject, useEffect, useRef } from "react";

const MARGIN = 24;

function reveal(paper: HTMLElement | null, cursor: string): void {
  const el = paper?.querySelector(`[data-anchor="${cursor}"]`);
  const box = paper?.getBoundingClientRect();
  if (!el || !box) return;
  const r = el.getBoundingClientRect();
  const top = Math.max(box.top, 0) + MARGIN;
  const bottom = Math.min(box.bottom, window.innerHeight) - MARGIN;
  if (r.top < top || r.bottom > bottom) el.scrollIntoView({ block: "center", behavior: "smooth" });
}

export function useFollowCursor(paper: RefObject<HTMLElement | null>, cursor: string | null, enabled: boolean): void {
  const last = useRef<string | null>(null);
  useEffect(() => {
    const first = last.current === null;
    last.current = cursor;
    if (cursor && enabled && !first) reveal(paper.current, cursor);
  }, [paper, cursor, enabled]);
}
