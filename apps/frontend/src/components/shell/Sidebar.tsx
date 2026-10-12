"use client";

import { Kbd, cn } from "@seam/ui";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarRecent } from "@/features/activity/SidebarRecent";
import { Logo } from "../brand";
import { ThemeToggle } from "./ThemeToggle";
import { NAV } from "./nav";
import { useSignOut } from "./useSignOut";
import { LANDING } from "@/lib/routes";

interface SidebarProps {
  name: string;
  onNavigate?: () => void;
}

export function Sidebar({ name, onNavigate }: SidebarProps) {
  const path = usePathname();
  const signOut = useSignOut();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-6">
        <Logo href={LANDING} className="text-[24px] leading-none" />
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("seam:palette"))}
          className="rounded-full hover:opacity-80"
          aria-label="Open command palette"
        >
          <Kbd className="h-6 px-2">⌘K</Kbd>
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 px-3 py-4">
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon, match }) => {
            const active = match(path);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-full px-3 py-1.5 text-[13.5px] font-medium transition-colors",
                  active ? "bg-cream text-ink" : "text-ink-soft hover:bg-cream/70 hover:text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="scroll-thin min-h-0 flex-1 overflow-auto">
          <SidebarRecent onNavigate={onNavigate} />
        </div>
        <div className="flex items-center gap-2 border-t border-line px-3 pt-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-medium text-on-ink">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
          <ThemeToggle />
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-cream hover:text-ink"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
