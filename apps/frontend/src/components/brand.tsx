import Link from "next/link";
import { cn } from "@seam/ui";

interface LogoProps {
  className?: string;
  href?: string;
}

export function Logo({ className, href = "/" }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn("font-display text-[26px] tracking-[-0.03em]", className)}
      aria-label="Seam home"
    >
      Seam
    </Link>
  );
}
