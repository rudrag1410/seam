import { type FitCheck as Fit, FitStatus } from "@seam/api-client";
import { cn } from "@seam/ui";
import { AlertTriangle, Check, Minus } from "lucide-react";

const STATUS_TONE: Record<FitStatus, string> = {
  [FitStatus.Ok]: "bg-ins text-ins-line",
  [FitStatus.Warn]: "bg-warn text-warn-ink",
  [FitStatus.Unclear]: "bg-cream text-ink-muted",
};

interface StatusGlyphProps {
  status: FitStatus;
}

function StatusGlyph({ status }: StatusGlyphProps) {
  if (status === FitStatus.Ok) return <Check className="size-3" />;
  if (status === FitStatus.Warn) return <AlertTriangle className="size-2.5" />;
  return <Minus className="size-3" />;
}

interface FitCheckProps {
  fit: Fit;
}

export function FitCheck({ fit }: FitCheckProps) {
  if (!fit.items.length) return null;
  return (
    <ul className="space-y-2">
      {fit.items.map((i) => (
        <li key={i.key} className="flex items-start gap-2.5 text-[13px]">
          <span
            className={cn(
              "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
              STATUS_TONE[i.status],
            )}
          >
            <StatusGlyph status={i.status} />
          </span>
          <span>
            <span className="font-medium">{i.label}</span>
            <span className="text-ink-soft"> · {i.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
