import { Skeleton } from "@seam/ui";

export function PaperSkeleton() {
  return <Skeleton className="mx-auto h-[760px] w-full max-w-[794px] rounded-none bg-bg" />;
}

/** Mirrors the workspace's header, conversation and paper so opening a review doesn't reflow. */
export function WorkspaceSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh" aria-busy>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4 sm:px-6">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="ml-auto hidden h-8 w-[236px] rounded-full sm:block" />
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
