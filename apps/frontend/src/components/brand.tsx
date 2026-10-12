import Link from "next/link";
import { cn } from "@seam/ui";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("font-display text-[26px] tracking-[-0.03em]", className)} aria-label="Seam home">
      Seam
    </Link>
  );
}
