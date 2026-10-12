import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

type Tone = "neutral" | "green" | "yellow" | "orange" | "ink";
const tones: Record<Tone, string> = {
  neutral: "bg-cream text-ink-soft",
  green: "bg-ins text-ink",
  yellow: "bg-warn text-warn-ink",
  orange: "bg-del text-ink",
  ink: "bg-ink text-on-ink",
};

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[16px] border border-line bg-panel", className)} {...props} />;
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-cream", className)} {...props} />;
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-md border border-line-strong bg-bg px-1.5 font-mono text-[11px] leading-5 text-ink-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block size-4 animate-spin rounded-full border-2 border-line-strong border-t-ink", className)}
    />
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 text-sm select-none", className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="grid size-[18px] place-items-center rounded-[6px] border border-line-strong bg-bg text-transparent transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-on-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
      >
        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
        </svg>
      </span>
      {label}
    </label>
  );
}

/** The "working" mark: a ring of stitches that slowly turns. Sized by its font size or `className`. */
export function StitchRing({ className, label = "In progress" }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 20 20" role="img" aria-label={label} className={cn("stitch-ring size-4 shrink-0", className)}>
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3.6 4.78" />
    </svg>
  );
}

/** A short line of stitches that sews itself, for "this is being worked on". */
export function StitchLine({ className }: { className?: string }) {
  return <span aria-hidden className={cn("stitch-sew w-12", className)} />;
}
