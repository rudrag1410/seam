"use client";

import { ErrorState } from "@/components/feedback/states";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-24">
      <ErrorState error={error} onRetry={reset} />
    </main>
  );
}
