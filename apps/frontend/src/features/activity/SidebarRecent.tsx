"use client";

import { SessionStatus, type SessionListItem } from "@seam/api-client";
import { Skeleton, cn } from "@seam/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/feedback/ConfirmDelete";
import { api, unwrap } from "@/lib/api";
import { presentError } from "@/lib/errors";
import { timeAgo } from "@/lib/format";
import { keys } from "@/lib/queries";

const RECENT_LIMIT = 8;
const NEW_CHAT_PATH = "/tailor/new";

function chatPath(id: string): string {
  return `/tailor/${id}`;
}

function titleOf(chat: SessionListItem): string {
  return [chat.jd_title, chat.jd_company].filter(Boolean).join(" · ") || "Untitled job";
}

function isRunning(chat: SessionListItem): boolean {
  return chat.status === SessionStatus.Queued || chat.status === SessionStatus.Running;
}

function progressOf(chat: SessionListItem): string {
  switch (chat.status) {
    case SessionStatus.Finalized:
      return "Saved";
    case SessionStatus.Failed:
      return "Didn't finish";
    case SessionStatus.Queued:
    case SessionStatus.Running:
      return "Working…";
    default:
      return `${chat.decided_count} of ${chat.suggestion_count} reviewed`;
  }
}

function RecentSkeleton() {
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

interface ChatRowProps {
  chat: SessionListItem;
  active: boolean;
  onNavigate?: () => void;
  onDelete: () => void;
}

function ChatRow({ chat, active, onNavigate, onDelete }: ChatRowProps) {
  const title = titleOf(chat);
  return (
    <div className={cn("group relative rounded-lg hover:bg-cream", active && "bg-cream")}>
      <Link href={chatPath(chat.id)} onClick={onNavigate} aria-current={active ? "page" : undefined} className="block px-3 py-1.5 pr-9">
        <span className={cn("block truncate text-[13px] group-hover:text-ink", active ? "text-ink" : "text-ink-soft")}>{title}</span>
        <span className="text-[11px] text-ink-muted">
          {timeAgo(chat.created_at)} · {progressOf(chat)}
        </span>
      </Link>
      {!isRunning(chat) && (
        <button
          type="button"
          aria-label={`Delete ${title}`}
          onClick={onDelete}
          className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-full text-ink-muted hover:bg-bg hover:text-ink focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

function fetchChats() {
  return unwrap(api.GET("/v1/tailor-sessions", { params: { query: { limit: RECENT_LIMIT } } }));
}

function removeChat(id: string) {
  return unwrap(api.DELETE("/v1/tailor-sessions/{session_id}", { params: { path: { session_id: id } } }));
}

interface SidebarRecentProps {
  onNavigate?: () => void;
}

export function SidebarRecent({ onNavigate }: SidebarRecentProps) {
  const qc = useQueryClient();
  const router = useRouter();
  const path = usePathname();
  const [confirming, setConfirming] = useState<string | null>(null);
  const { data, isPending } = useQuery({ queryKey: keys.recent, queryFn: fetchChats });
  const remove = useMutation({
    mutationFn: removeChat,
    onSuccess: (_, id) => {
      setConfirming(null);
      toast.success("Chat deleted");
      qc.removeQueries({ queryKey: keys.session(id) });
      qc.invalidateQueries({ queryKey: keys.recent });
      qc.invalidateQueries({ queryKey: ["activity"] });
      if (path === chatPath(id)) router.replace(NEW_CHAT_PATH);
    },
    onError: (error) => toast.error(presentError(error).title),
  });

  if (isPending) return <RecentSkeleton />;
  if (!data?.length) return null;
  return (
    <div>
      <p className="px-3 pb-1.5 text-[11px] font-medium tracking-wide text-ink-muted uppercase">Chats</p>
      <ul className="space-y-0.5">
        {data.map((chat) => (
          <li key={chat.id}>
            {confirming === chat.id ? (
              <ConfirmDelete title={titleOf(chat)} note="Saved resume versions are kept." busy={remove.isPending} onConfirm={() => remove.mutate(chat.id)} onCancel={() => setConfirming(null)} />
            ) : (
              <ChatRow chat={chat} active={path === chatPath(chat.id)} onNavigate={onNavigate} onDelete={() => setConfirming(chat.id)} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
