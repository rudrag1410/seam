"use client";

import { Button } from "@seam/ui";
import { useMutation } from "@tanstack/react-query";
import { MessageCircleQuestion } from "lucide-react";
import { ErrorState } from "@/components/feedback/states";
import { api, unwrap } from "@/lib/api";

export function InterviewPrepPanel({ versionId }: { versionId: string }) {
  const prep = useMutation({
    mutationFn: () => unwrap(api.POST("/v1/versions/{version_id}/interview-prep", { params: { path: { version_id: versionId } } })),
  });
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-ink-soft">Likely questions from the role&apos;s must-haves and your gaps, with talking points from your own resume.</p>
      <Button onClick={() => prep.mutate()} loading={prep.isPending}><MessageCircleQuestion className="size-4" /> {prep.data ? "Regenerate" : "Prepare questions"}</Button>
      {prep.isError && <ErrorState error={prep.error} onRetry={() => prep.mutate()} />}
      {prep.data && (
        <ol className="space-y-5">
          {prep.data.questions.map((q, i) => (
            <li key={q.question}>
              <p className="font-medium"><span className="tabular text-ink-muted">{i + 1}.</span> {q.question}</p>
              <p className="mt-1 text-[13px] text-ink-muted">{q.why}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-ink-soft">{q.talking_points.map((t) => <li key={t}>{t}</li>)}</ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
