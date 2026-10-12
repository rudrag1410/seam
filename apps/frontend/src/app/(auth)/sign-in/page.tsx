import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm, AuthMode } from "@/features/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return (
    <>
      <h1 className="font-display text-[40px]">Welcome back</h1>
      <p className="mt-2 mb-8 text-ink-muted">Log in to continue tailoring.</p>
      <Suspense>
        <AuthForm mode={AuthMode.SignIn} />
      </Suspense>
    </>
  );
}
