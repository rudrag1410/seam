"use client";

import { Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { markAppReady } from "@/lib/ready";
import { useMe } from "@/lib/queries";
import { Logo } from "../brand";
import { CommandPalette } from "./CommandPalette";
import { ShellSkeleton } from "./ShellSkeleton";
import { Sidebar } from "./Sidebar";
import { LANDING } from "@/lib/routes";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const me = useMe();
  const router = useRouter();
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setDrawer(false), [path]);
  useEffect(() => {
    if (me.data && !me.data.onboarded) router.replace("/onboarding/resume");
  }, [me.data, router]);

  useEffect(() => {
    if (me.data || me.isError) markAppReady();
  }, [me.data, me.isError]);

  if (!me.data?.onboarded) return <ShellSkeleton />;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-panel lg:block">
        <Sidebar name={me.data.full_name} />
      </aside>
      <div className="flex h-[57px] items-center justify-between border-b border-line bg-panel px-4 lg:hidden">
        <Logo href={LANDING} />
        <button type="button" aria-label="Open menu" onClick={() => setDrawer(true)} className="grid size-9 place-items-center rounded-full hover:bg-cream">
          <Menu className="size-5" />
        </button>
      </div>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/30" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[290px] bg-panel shadow-xl">
            <button type="button" aria-label="Close" onClick={() => setDrawer(false)} className="absolute top-3 right-3 grid size-8 place-items-center rounded-full hover:bg-cream">
              <X className="size-4" />
            </button>
            <Sidebar name={me.data.full_name} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
      <main className="min-w-0">{children}</main>
      <CommandPalette />
    </div>
  );
}
