import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/features/auth/AuthForm";

export const metadata: Metadata = { title: "Sign up" };

export default function Page() {
  return (
    <>
      <h1 className="font-display text-[40px]">Create your account</h1>
      <p className="mt-2 mb-8 text-ink-muted">Start tailoring in a minute.</p>
      <Suspense>
        <AuthForm mode="sign-up" />
      </Suspense>
    </>
  );
}
