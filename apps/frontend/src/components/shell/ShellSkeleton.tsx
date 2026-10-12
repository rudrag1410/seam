import { Skeleton } from "@seam/ui";
import { Logo } from "../brand";
import { LANDING } from "@/lib/routes";

export function ShellSkeleton() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]" aria-busy>
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-panel lg:block">
        <div className="flex h-full flex-col gap-6 px-3 py-4">
          <div className="flex h-8 items-center px-3">
            <Logo href={LANDING} />
          </div>
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-9 rounded-full" />
            ))}
          </div>
          <div className="mt-auto flex items-center gap-2 border-t border-line px-3 pt-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </aside>
      <div className="flex h-[57px] items-center border-b border-line bg-panel px-4 lg:hidden">
        <Logo href={LANDING} />
      </div>
      <main />
    </div>
  );
}
