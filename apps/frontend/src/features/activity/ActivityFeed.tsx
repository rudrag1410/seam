"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Segmented, Skeleton, Button } from "@seam/ui";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { ActivityGroup } from "@seam/api-client";
import { api, unwrap } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { activityHref } from "./links";

enum FeedFilter {
  All = "all",
  Resumes = "resumes",
  Reviews = "reviews",
}

const FILTERS = [
  { value: FeedFilter.All, label: "All" },
  { value: FeedFilter.Resumes, label: "Resumes" },
  { value: FeedFilter.Reviews, label: "Reviews" },
];

const GROUP_OF: Record<FeedFilter, ActivityGroup | undefined> = {
  [FeedFilter.All]: undefined,
  [FeedFilter.Resumes]: ActivityGroup.Resume,
  [FeedFilter.Reviews]: ActivityGroup.Review,
};

interface ActivityFeedProps {
  limit?: number;
  filterable?: boolean;
  paged?: boolean;
}

export function ActivityFeed({ limit = 20, filterable = true, paged = true }: ActivityFeedProps) {
  const [filter, setFilter] = useState<FeedFilter>(FeedFilter.All);
  const q = useInfiniteQuery({
    queryKey: ["activity", filter, limit],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      unwrap(
        api.GET("/v1/activity", {
          params: { query: { limit, cursor: pageParam, type: GROUP_OF[filter] } },
        }),
      ),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div>
      {filterable && (
        <Segmented
          size="sm"
          className="mb-6"
          aria-label="Filter activity"
          value={filter}
          onChange={setFilter}
          options={FILTERS}
        />
      )}
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: limit > 5 ? 8 : 5 }, (_, i) => (
            <Skeleton key={i} className="h-[47px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="Uploads, tailoring runs and exports show up here as you go."
        />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {items.map((e) => {
            const href = activityHref(e);
            const row = (
              <>
                <span className="size-1.5 shrink-0 rounded-full bg-ink" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{e.summary}</span>
                <time
                  dateTime={e.created_at}
                  className="tabular shrink-0 text-[13px] text-ink-muted"
                >
                  {timeAgo(e.created_at)}
                </time>
              </>
            );
            return (
              <li key={e.id}>
                {href ? (
                  <Link href={href} className="flex h-[46px] items-center gap-3 hover:bg-panel">
                    {row}
                  </Link>
                ) : (
                  <div className="flex h-[46px] items-center gap-3">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {paged && q.hasNextPage && (
        <Button
          variant="secondary"
          className="mt-6"
          loading={q.isFetchingNextPage}
          onClick={() => q.fetchNextPage()}
        >
          Load more
        </Button>
      )}
    </div>
  );
}
