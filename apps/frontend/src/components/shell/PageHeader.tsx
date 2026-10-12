import type { ReactNode } from "react";

export function PageHeader({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[40px] sm:text-[48px]">{title}</h1>
        {body && <p className="mt-2 max-w-xl text-ink-soft">{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageBody({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={`mx-auto px-4 py-8 sm:px-8 sm:py-12 ${wide ? "max-w-[1180px]" : "max-w-[860px]"}`}>{children}</div>;
}
