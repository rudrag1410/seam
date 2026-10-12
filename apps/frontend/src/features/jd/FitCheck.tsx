import type { FitCheck as Fit } from "@seam/api-client";
import { cn } from "@seam/ui";
import { AlertTriangle, Check, Minus } from "lucide-react";

export function FitCheck({ fit }: { fit: Fit }) {
  if (!fit.items.length) return null;
  return (
    <ul className="space-y-2">
      {fit.items.map((i) => (
        <li key={i.key} className="flex items-start gap-2.5 text-[13px]">
          <span
            className={cn(
              "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
              i.status === "ok" && "bg-ins text-ins-line",
              i.status === "warn" && "bg-warn text-warn-ink",
              i.status === "unclear" && "bg-cream text-ink-muted",
            )}
          >
            {i.status === "ok" ? <Check className="size-3" /> : i.status === "warn" ? <AlertTriangle className="size-2.5" /> : <Minus className="size-3" />}
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
