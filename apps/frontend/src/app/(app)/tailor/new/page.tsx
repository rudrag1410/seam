"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TailorWorkspace } from "@/features/workspace/TailorWorkspace";

function NewTailor() {
  const base = useSearchParams().get("base");
  return <TailorWorkspace baseVersionId={base} />;
}

export default function Page() {
  return (
    <Suspense>
      <NewTailor />
    </Suspense>
  );
}
