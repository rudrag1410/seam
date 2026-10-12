import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "../cn";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-on-ink hover:opacity-90",
  secondary: "bg-cream text-ink hover:bg-line",
  outline: "border border-line-strong bg-bg text-ink hover:bg-panel",
  ghost: "text-ink-soft hover:bg-cream hover:text-ink",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] whitespace-nowrap transition-[background,opacity] duration-150 disabled:pointer-events-none disabled:opacity-45",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <span className={cn("inline-flex items-center justify-center gap-2", loading && "invisible")}>
        {children}
      </span>
      {loading && <Loader2 className="absolute size-4 animate-spin" aria-hidden />}
    </button>
  );
}
