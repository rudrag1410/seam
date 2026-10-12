import type { DiffRun } from "@seam/resume-core";

interface InlineDiffProps {
  runs: DiffRun[];
}

export function InlineDiff({ runs }: InlineDiffProps) {
  return (
    <>
      {runs.map((r, i) =>
        r.kind === "equal" ? (
          <span key={i}>{r.text}</span>
        ) : r.kind === "insert" ? (
          <ins key={i} className="rounded-[3px] bg-ins px-[1px] no-underline decoration-ins-line [text-decoration-line:underline] [text-decoration-thickness:1.5px] [text-underline-offset:3px]">
            {r.text}
          </ins>
        ) : (
          <del key={i} className="rounded-[3px] bg-del px-[1px] text-ink-muted decoration-del-line [text-decoration-thickness:1.5px]">
            {r.text}
          </del>
        ),
      )}
    </>
  );
}
