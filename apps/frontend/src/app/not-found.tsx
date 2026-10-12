import { buttonClass } from "@seam/ui";
import Link from "next/link";
import { LANDING } from "@/lib/routes";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-32 text-center">
      <h1 className="font-display text-5xl">Page not found</h1>
      <p className="text-ink-muted">That page doesn&apos;t exist, or it moved.</p>
      <Link href={LANDING} className={buttonClass("primary", "md")}>
        Back to Seam
      </Link>
    </main>
  );
}
