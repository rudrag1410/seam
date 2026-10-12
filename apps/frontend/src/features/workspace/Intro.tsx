"use client";

import { Button, Skeleton } from "@seam/ui";
import { useState } from "react";
import { Dropzone, ResumeCard } from "@/features/upload/Dropzone";
import { useMe, usePrimaryResume } from "@/lib/queries";
import { Say } from "./Thread";

function ResumeInUse() {
  const primary = usePrimaryResume();
  const [replacing, setReplacing] = useState(false);

  if (primary.isPending) return <Skeleton className="h-[133px] rounded-[16px]" />;
  if (primary.data && !replacing) {
    return (
      <ResumeCard
        resume={primary.data}
        action={
          <Button variant="secondary" size="sm" onClick={() => setReplacing(true)}>
            Replace
          </Button>
        }
      />
    );
  }
  return (
    <div className="space-y-2">
      <Dropzone compact onUploaded={() => setReplacing(false)} />
      {replacing && (
        <Button variant="ghost" size="sm" onClick={() => setReplacing(false)}>
          Keep the current resume
        </Button>
      )}
    </div>
  );
}

interface IntroProps {
  composing: boolean;
  branching: boolean;
}

export function Intro({ composing, branching }: IntroProps) {
  const first = useMe().data?.full_name.split(" ")[0];
  return (
    <>
      <Say>
        {first ? `Hi ${first}. ` : ""}
        {branching ? "You're branching from an earlier version. " : ""}
        Paste the job description for the role you want. I&apos;ll read it, score your resume
        against it, and suggest edits line by line. Nothing on your resume changes until you accept
        it.
      </Say>
      {composing && <ResumeInUse />}
    </>
  );
}
