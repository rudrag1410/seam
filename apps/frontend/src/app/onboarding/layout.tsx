import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { LANDING } from "@/lib/routes";

interface OnboardingLayoutProps {
  children: ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Logo href={LANDING} />
      </header>
      <main className="mx-auto max-w-[640px] px-4 pt-6 pb-24 sm:px-6">{children}</main>
    </div>
  );
}
