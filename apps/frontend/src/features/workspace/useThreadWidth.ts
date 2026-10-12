"use client";

import { type KeyboardEvent, type PointerEvent, useMemo } from "react";

const STORAGE_KEY = "seam-thread-width";
const VAR = "--thread-w";
const DEFAULT_WIDTH = 460;
const MIN_THREAD = 340;
const MIN_PAPER = 420;
const KEY_STEP = 24;

function clamp(width: number, total: number): number {
  const max = Math.max(MIN_THREAD, total - MIN_PAPER);
  return Math.min(Math.max(width, MIN_THREAD), max);
}

function readStored(): number {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

function writeStored(width: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.round(width)));
  } catch {}
}

export class ThreadResizer {
  private width: number | null = null;
  private container: HTMLElement | null = null;

  mount = (handle: HTMLElement | null): void => {
    this.container = handle?.parentElement ?? null;
    if (this.container) this.apply(this.width ?? readStored());
  };

  reset = (): void => {
    this.apply(DEFAULT_WIDTH);
    writeStored(DEFAULT_WIDTH);
  };

  onPointerDown = (e: PointerEvent<HTMLElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  onPointerMove = (e: PointerEvent<HTMLElement>): void => {
    const box = this.container?.getBoundingClientRect();
    if (box && e.currentTarget.hasPointerCapture(e.pointerId)) this.apply(e.clientX - box.left);
  };

  onPointerUp = (e: PointerEvent<HTMLElement>): void => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    writeStored(this.current());
  };

  onKeyDown = (e: KeyboardEvent<HTMLElement>): void => {
    const delta = e.key === "ArrowLeft" ? -KEY_STEP : e.key === "ArrowRight" ? KEY_STEP : 0;
    if (!delta) return;
    e.preventDefault();
    this.apply(this.current() + delta);
    writeStored(this.current());
  };

  private current(): number {
    return this.width ?? DEFAULT_WIDTH;
  }

  private apply(width: number): void {
    const el = this.container;
    if (!el) return;
    this.width = clamp(width, el.getBoundingClientRect().width);
    el.style.setProperty(VAR, `${this.width}px`);
  }
}

export function useThreadWidth(): ThreadResizer {
  return useMemo(() => new ThreadResizer(), []);
}
