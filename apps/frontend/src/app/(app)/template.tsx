import type { ReactNode } from "react";

interface TemplateProps {
  children: ReactNode;
}

/** Remounts on every navigation, giving each page a soft opacity-only fade (no movement). */
export default function Template({ children }: TemplateProps) {
  return <div className="animate-fade-in">{children}</div>;
}
