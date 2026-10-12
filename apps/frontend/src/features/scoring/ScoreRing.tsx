"use client";

import { cn } from "@seam/ui";
import { useEffect, useRef, useState } from "react";

/** Animated number that rolls toward its target. */
export function useRollingNumber(target: number, ms = 450) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || origin === target) {
      setValue(target);
      from.current = target;
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - (1 - t) ** 3;
      const v = origin + (target - origin) * eased;
      setValue(v);
      from.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

export function ScoreRing({ value, size = 96, stroke = 7, label, className }: {
  value: number; size?: number; stroke?: number; label?: string; className?: string;
}) {
  const shown = useRollingNumber(value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }} role="img" aria-label={`${label ?? "Score"}: ${Math.round(value)} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--cream)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, shown) / 100)}
        />
      </svg>
      <span className="font-display absolute text-[30px] tabular">{Math.round(shown)}</span>
    </div>
  );
}
