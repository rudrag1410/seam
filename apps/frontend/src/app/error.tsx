"use client";

import { ErrorState } from "@/components/feedback/states";

interface GlobalErrorProps {
  error: Error;
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <main className="mx-auto max-w-lg px-4 py-24">
      <ErrorState error={error} onRetry={reset} />
    </main>
  );
}
