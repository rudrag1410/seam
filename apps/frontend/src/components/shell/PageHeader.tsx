import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  body?: string;
  action?: ReactNode;
}

export function PageHeader({ title, body, action }: PageHeaderProps) {
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

interface PageBodyProps {
  children: ReactNode;
  wide?: boolean;
}

export function PageBody({ children, wide = false }: PageBodyProps) {
  return <div className={`mx-auto px-4 py-8 sm:px-8 sm:py-12 ${wide ? "max-w-[1180px]" : "max-w-[860px]"}`}>{children}</div>;
}
