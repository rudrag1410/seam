import type { ReactNode } from "react";
import { Logo } from "@/components/brand";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-4 pb-24">
        {children}
      </main>
    </div>
  );
}
