import { Skeleton } from "@seam/ui";

const PAPER_SECTIONS = [4, 3, 5];

export function PaperSkeleton() {
  return (
    <div
      aria-hidden
      className="mx-auto min-h-[880px] w-full max-w-[794px] bg-white px-6 py-8 shadow-[0_0_0_1px_var(--line),0_18px_40px_-24px_rgba(16,15,15,0.25)] sm:px-14 sm:py-12"
    >
      <div className="mb-8 flex flex-col items-center gap-3">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      {PAPER_SECTIONS.map((lines, section) => (
        <div key={section} className="mb-8">
          <div className="mb-4 border-b border-line pb-1.5">
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: lines }, (_, line) => (
              <Skeleton
                key={line}
                className={line === lines - 1 ? "h-3.5 w-3/5" : "h-3.5 w-full"}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkspaceSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh" aria-busy>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4 sm:px-6">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="ml-auto hidden h-8 w-[236px] rounded-full md:block" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(380px,460px)_1fr]">
        <div className="space-y-5 border-line px-5 py-6 lg:border-r">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="ml-auto h-24 w-4/5 rounded-[18px]" />
          <Skeleton className="h-56 rounded-[18px]" />
        </div>
        <div className="bg-cream/40 px-3 py-6 sm:px-8">
          <PaperSkeleton />
        </div>
      </div>
    </div>
  );
}
