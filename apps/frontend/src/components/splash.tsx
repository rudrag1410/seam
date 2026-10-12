"use client";

import { cn } from "@seam/ui";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { whenAppReady } from "@/lib/ready";

const APP_ROUTE = /^\/(tailor|resumes|activity|profile|preferences)(\/|$)/;
const MIN_FIRST_MS = 900; // long enough for the stitch to finish on a first visit
const MIN_REPEAT_MS = 250;
const MAX_MS = 4000; // never trap the user behind the splash
const FADE_MS = 450;

/** Covers the very first paint, so nothing flashes or reflows while fonts load and the
 *  session resolves. It is part of the server HTML, so there is no unstyled frame before it. */
export function Splash() {
  const path = usePathname();
  const [phase, setPhase] = useState<"show" | "hide" | "gone">("show");

  useEffect(() => {
    const started = performance.now();
    let seen = false;
    try {
      seen = sessionStorage.getItem("seam-splash") === "1";
      sessionStorage.setItem("seam-splash", "1");
    } catch {}
    const min = seen ? MIN_REPEAT_MS : MIN_FIRST_MS;

    const fonts = document.fonts?.ready ?? Promise.resolve();
    const app = APP_ROUTE.test(path) ? whenAppReady() : Promise.resolve();
    const cap = new Promise<void>((r) => setTimeout(r, MAX_MS));

    let cancelled = false;
    Promise.race([Promise.all([fonts, app]), cap]).then(() => {
      const wait = Math.max(0, min - (performance.now() - started));
      setTimeout(() => !cancelled && setPhase("hide"), wait);
    });
    return () => {
      cancelled = true;
    };
    // run once per full page load; client navigations don't remount the root layout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "hide") return;
    const t = setTimeout(() => setPhase("gone"), FADE_MS + 50);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;
  return (
    <div
      id="splash"
      role="status"
      aria-label="Loading Seam"
      className={cn(
        "fixed inset-0 z-[100] grid place-items-center bg-bg transition-opacity ease-out",
        phase === "hide" && "pointer-events-none opacity-0",
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="flex flex-col items-center gap-5">
        <span className="font-display animate-rise text-[64px] leading-none">Seam</span>
        <span className="splash-stitch" aria-hidden />
      </div>
      <noscript>
        <style>{"#splash{display:none}"}</style>
      </noscript>
    </div>
  );
}
