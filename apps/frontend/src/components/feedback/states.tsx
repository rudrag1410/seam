import { Button } from "@seam/ui";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { presentError } from "@/lib/errors";

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-line-strong px-6 py-14 text-center">
      <h3 className="text-[17px] font-medium tracking-[-0.01em]">{title}</h3>
      {body && <p className="max-w-sm text-sm text-ink-muted">{body}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const e = presentError(error);
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[16px] border border-line bg-del/60 p-4"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-del-line" aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-medium">{e.title}</p>
        {e.hint && <p className="mt-0.5 text-ink-soft">{e.hint}</p>}
      </div>
      {onRetry && e.retryable && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
