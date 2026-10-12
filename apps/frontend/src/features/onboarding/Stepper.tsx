import { cn } from "@seam/ui";
import { Check } from "lucide-react";
import { STEPS, type StepSlug } from "./steps";

/** One row at every width: numbered circles, with only the current step's label spelled out.
 *  The connectors stretch to fill whatever space is left. */
export function Stepper({ current }: { current: StepSlug }) {
  const at = STEPS.findIndex((s) => s.slug === current);
  return (
    <ol className="flex w-full items-center gap-2 text-[13px]" aria-label="Onboarding progress">
      {STEPS.map((s, i) => (
        <li key={s.slug} className={cn("flex items-center gap-2", i < STEPS.length - 1 && "flex-1 last:flex-none")} aria-current={i === at ? "step" : undefined}>
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium tabular",
              i <= at ? "bg-ink text-on-ink" : "bg-cream text-ink-muted",
            )}
          >
            {i < at ? <Check className="size-3.5" aria-hidden /> : i + 1}
          </span>
          <span className={cn("whitespace-nowrap", i === at ? "font-medium" : "sr-only")}>{s.label}</span>
          {i < STEPS.length - 1 && <span className="h-px min-w-3 flex-1 bg-line-strong" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}
