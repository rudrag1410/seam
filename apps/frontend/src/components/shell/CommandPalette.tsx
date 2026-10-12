"use client";

import { Kbd } from "@seam/ui";
import { Command } from "cmdk";
import { LogOut, Moon, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listen } from "@/lib/dom";
import { useSignOut } from "./useSignOut";
import { NAV } from "./nav";
import { useTheme } from "./ThemeToggle";

function isPaletteShortcut(e: KeyboardEvent): boolean {
  return e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);
}

function closeThen(setOpen: (open: boolean) => void, action: () => void): void {
  setOpen(false);
  action();
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const signOut = useSignOut();
  const { toggle } = useTheme();

  useEffect(
    () =>
      listen("keydown", (e) => {
        if (!isPaletteShortcut(e)) return;
        e.preventDefault();
        setOpen((o) => !o);
      }),
    [],
  );
  useEffect(() => listen("seam:palette", () => setOpen(true)), []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      overlayClassName="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[2px]"
      contentClassName="fixed top-[18vh] left-1/2 z-50 w-[min(560px,92vw)] -translate-x-1/2 overflow-hidden rounded-[16px] bg-bg shadow-[var(--shadow-pop)]"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-4 text-ink-muted" aria-hidden />
        <Command.Input
          placeholder="Search actions…"
          className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-muted"
        />
        <Kbd>esc</Kbd>
      </div>
      <Command.List className="scroll-thin max-h-[320px] overflow-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-ink-muted">
          Nothing found.
        </Command.Empty>
        <Command.Group
          heading="Go to"
          className="text-xs text-ink-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
        >
          {NAV.map(({ href, label, icon: Icon }) => (
            <Command.Item
              key={href}
              value={label}
              onSelect={() => closeThen(setOpen, () => router.push(href))}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink data-[selected=true]:bg-cream"
            >
              <Icon className="size-4 text-ink-muted" aria-hidden /> {label}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group
          heading="Preferences"
          className="text-xs text-ink-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
        >
          <Command.Item
            value="Switch theme"
            onSelect={() => closeThen(setOpen, toggle)}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink data-[selected=true]:bg-cream"
          >
            <Moon className="size-4 text-ink-muted" aria-hidden /> Switch theme
          </Command.Item>
          <Command.Item
            value="Sign out"
            onSelect={() => closeThen(setOpen, signOut)}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink data-[selected=true]:bg-cream"
          >
            <LogOut className="size-4 text-ink-muted" aria-hidden /> Sign out
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
