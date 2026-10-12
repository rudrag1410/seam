"use client";

import { type RefObject, useEffect, useRef } from "react";

const MARGIN = 24;

/** Scrolls the change into the middle of the paper, but only when it is actually off screen. */
function reveal(paper: HTMLElement | null, cursor: string): void {
  const el = paper?.querySelector(`[data-anchor="${cursor}"]`);
  const box = paper?.getBoundingClientRect();
  if (!el || !box) return;
  const r = el.getBoundingClientRect();
  const top = Math.max(box.top, 0) + MARGIN;
  const bottom = Math.min(box.bottom, window.innerHeight) - MARGIN;
  if (r.top < top || r.bottom > bottom) el.scrollIntoView({ block: "center", behavior: "smooth" });
}

/** Keeps the change under review in view as the user steps through. The selection a session
 *  opens with is left alone, so nothing moves before anyone has acted. */
export function useFollowCursor(paper: RefObject<HTMLElement | null>, cursor: string | null, enabled: boolean): void {
  const last = useRef<string | null>(null);
  useEffect(() => {
    const first = last.current === null;
    last.current = cursor;
    if (cursor && enabled && !first) reveal(paper.current, cursor);
  }, [paper, cursor, enabled]);
}
