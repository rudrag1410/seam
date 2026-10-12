import { cn } from "../cn";

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

/** The pill toggle: a cream track with a white active segment. */
export function Segmented<T extends string>({ value, onChange, options, size = "md", className, ...aria }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" className={cn("inline-flex items-center rounded-full bg-cream", size === "sm" ? "h-8 p-0.5" : "p-1", className)} {...aria}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center rounded-full font-medium transition-[background,color,box-shadow] duration-150",
            size === "sm" ? "h-7 px-3.5 text-[13px]" : "px-5 py-2 text-sm",
            o.value === value ? "bg-bg text-ink shadow-[0_1px_2px_rgba(16,15,15,0.08)]" : "text-ink-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
