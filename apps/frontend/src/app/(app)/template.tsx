import type { ReactNode } from "react";

/** Remounts on every navigation, giving each page a soft opacity-only fade (no movement). */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
