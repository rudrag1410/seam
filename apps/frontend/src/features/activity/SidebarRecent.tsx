"use client";

import { Skeleton } from "@seam/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, unwrap } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { keys } from "@/lib/queries";
import { activityHref } from "./links";

interface SidebarRecentProps {
  onNavigate?: () => void;
}

export function SidebarRecent({ onNavigate }: SidebarRecentProps) {
  const { data, isPending } = useQuery({
    queryKey: keys.recent,
    queryFn: () => unwrap(api.GET("/v1/activity", { params: { query: { limit: 5 } } })),
  });
  if (isPending) {
    return (
      <div aria-hidden>
        <Skeleton className="mx-3 mb-2 h-3 w-14" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="px-3 py-1.5">
            <Skeleton className="h-[19px] w-full" />
            <Skeleton className="mt-1 h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }
  if (!data?.items.length) return null;
  return (
    <div>
      <p className="px-3 pb-1.5 text-[11px] font-medium tracking-wide text-ink-muted uppercase">Recent</p>
      <ul>
        {data.items.map((e) => {
          const href = activityHref(e);
          const inner = (
            <>
              <span className="block truncate text-[13px] text-ink-soft group-hover:text-ink">{e.summary}</span>
              <span className="text-[11px] text-ink-muted">{timeAgo(e.created_at)}</span>
            </>
          );
          return (
            <li key={e.id}>
              {href ? (
                <Link href={href} onClick={onNavigate} className="group block rounded-lg px-3 py-1.5 hover:bg-cream">{inner}</Link>
              ) : (
                <div className="px-3 py-1.5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
