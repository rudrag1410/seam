"use client";

import type { ThreadResizer } from "./useThreadWidth";

interface ResizeHandleProps {
  resizer: ThreadResizer;
}

export function ResizeHandle({ resizer }: ResizeHandleProps) {
  return (
    <div
      ref={resizer.mount}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the chat and resume panels"
      tabIndex={0}
      onPointerDown={resizer.onPointerDown}
      onPointerMove={resizer.onPointerMove}
      onPointerUp={resizer.onPointerUp}
      onKeyDown={resizer.onKeyDown}
      onDoubleClick={resizer.reset}
      style={{ left: "var(--thread-w)" }}
      className="group absolute inset-y-0 z-20 hidden w-3 -translate-x-1/2 cursor-col-resize touch-none justify-center outline-none lg:flex"
    >
      <span className="h-full w-px bg-transparent transition-colors group-hover:bg-ink/30 group-focus-visible:bg-ink group-active:bg-ink" />
    </div>
  );
}
