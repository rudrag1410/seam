"use client";

import { useEffect } from "react";
import type { ViewMode } from "../resume-canvas/view-model";
import { useReview } from "./store";

const MODES: ViewMode[] = ["suggestions", "clean", "original"];

function typing(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

/** J/K move, A accept, R reject, E edit, Shift+A accept all in section, V cycle view, Cmd+Z undo. */
export function useReviewKeys(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target) || e.altKey) return;
      const s = useReview.getState();
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === "z") {
        e.preventDefault();
        return s.undo();
      }
      if (e.metaKey || e.ctrlKey) return;
      const current = s.suggestions.find((x) => x.id === s.cursor);
      switch (key) {
        case "j": return s.move(1);
        case "k": return s.move(-1);
        case "a":
          if (e.shiftKey && current) return s.acceptSection(current.section);
          if (current) s.decide(current.id, "accepted");
          return;
        case "r": if (current) s.decide(current.id, "rejected"); return;
        case "e": if (current && current.op !== "reorder" && current.op !== "remove_bullet") s.patch({ editing: current.id }); return;
        case "v": s.patch({ mode: MODES[(MODES.indexOf(s.mode) + 1) % MODES.length]! }); return;
        case "escape": s.patch({ editing: null, confirming: null });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
