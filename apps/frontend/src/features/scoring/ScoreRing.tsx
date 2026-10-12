"use client";

import { cn } from "@seam/ui";
import { useEffect, useRef, useState } from "react";

class Roll {
  private frame = 0;
  private started = 0;

  constructor(
    private readonly from: number,
    private readonly to: number,
    private readonly ms: number,
    private readonly onValue: (value: number) => void,
  ) {}

  start(): () => void {
    if (this.from === this.to || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.onValue(this.to);
    } else {
      this.started = performance.now();
      this.frame = requestAnimationFrame(this.step);
    }
    return this.stop;
  }

  private readonly step = (now: number): void => {
    const t = Math.min(1, (now - this.started) / this.ms);
    this.onValue(this.from + (this.to - this.from) * (1 - (1 - t) ** 3));
    if (t < 1) this.frame = requestAnimationFrame(this.step);
  };

  private readonly stop = (): void => cancelAnimationFrame(this.frame);
}

function useRollingNumber(target: number, ms = 450) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const roll = new Roll(from.current, target, ms, (v) => {
      from.current = v;
      setValue(v);
    });
    return roll.start();
  }, [target, ms]);
  return value;
}

interface ScoreRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}

export function ScoreRing({ value, size = 96, stroke = 7, label, className }: ScoreRingProps) {
  const shown = useRollingNumber(value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? "Score"}: ${Math.round(value)} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--cream)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, shown) / 100)}
        />
      </svg>
      <span className="font-display tabular absolute text-[30px]">{Math.round(shown)}</span>
    </div>
  );
}
