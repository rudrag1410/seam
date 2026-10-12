"use client";

import { Decision, OpName } from "@seam/api-client";
import { useEffect } from "react";
import { isTyping, listen } from "@/lib/dom";
import { ViewMode } from "../resume-canvas/view-model";
import { acceptSection, decide, move, undo } from "./actions";
import { useReview } from "./store";

const MODES: ViewMode[] = [ViewMode.Suggestions, ViewMode.Clean, ViewMode.Original];

function nextMode(mode: ViewMode): ViewMode {
  return MODES[(MODES.indexOf(mode) + 1) % MODES.length]!;
}

function onReviewKey(e: KeyboardEvent): void {
  if (isTyping(e.target) || e.altKey) return;
  const key = e.key.toLowerCase();
  if ((e.metaKey || e.ctrlKey) && key === "z") {
    e.preventDefault();
    undo();
    return;
  }
  if (e.metaKey || e.ctrlKey) return;
  const s = useReview.getState();
  const current = s.suggestions.find((x) => x.id === s.cursor);
  switch (key) {
    case "j":
      return move(1);
    case "k":
      return move(-1);
    case "v":
      return useReview.setState({ mode: nextMode(s.mode) });
    case "escape":
      return useReview.setState({ editing: null, confirming: null });
  }
  if (!current) return;
  switch (key) {
    case "a":
      return e.shiftKey ? acceptSection(current.section) : decide(current.id, Decision.Accepted);
    case "r":
      return decide(current.id, Decision.Rejected);
    case "e":
      if (current.op !== OpName.Reorder && current.op !== OpName.RemoveBullet) useReview.setState({ editing: current.id });
  }
}

export function useReviewKeys(enabled: boolean) {
  useEffect(() => (enabled ? listen("keydown", onReviewKey) : undefined), [enabled]);
}
