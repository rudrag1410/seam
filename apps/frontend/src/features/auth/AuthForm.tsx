"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input } from "@seam/ui";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErrorState } from "@/components/feedback/states";
import { api, unwrap } from "@/lib/api";
import { keys } from "@/lib/queries";
import { LANDING } from "@/lib/routes";
import { AuthMode } from "./mode";

const schema = z.object({
  full_name: z.string().trim().min(1, "Enter your name").optional(),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});
type Values = z.infer<typeof schema>;

const SIGN_IN = "/sign-in";
const SIGN_UP = "/sign-up";

function authenticate(mode: AuthMode, v: Values) {
  return mode === AuthMode.SignUp
    ? unwrap(api.POST("/v1/auth/signup", { body: { email: v.email, password: v.password, full_name: v.full_name! } }))
    : unwrap(api.POST("/v1/auth/login", { body: { email: v.email, password: v.password } }));
}

function fetchMe() {
  return unwrap(api.GET("/v1/me"));
}

function destination(next: string | null): string {
  return next && next.startsWith("/") ? next : LANDING;
}

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const expired = params.get("reason") === "expired";
  const qc = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const signUp = mode === AuthMode.SignUp;
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(async (v) => {
        setError(null);
        if (signUp && !v.full_name) return setFieldError("full_name", { message: "Enter your name" });
        try {
          await authenticate(mode, v);
          qc.clear();
          await qc.prefetchQuery({ queryKey: keys.me, queryFn: fetchMe });
          router.replace(destination(next));
        } catch (e) {
          setError(e);
        }
      })}
    >
      {expired && (
        <p role="status" className="rounded-[12px] bg-warn px-4 py-3 text-sm text-warn-ink">
          Your session expired. Please sign in again to pick up where you left off.
        </p>
      )}
      {signUp && (
        <Field label="Full name" error={errors.full_name?.message} htmlFor="full_name">
          <Input id="full_name" autoComplete="name" aria-invalid={!!errors.full_name} {...register("full_name")} />
        </Field>
      )}
      <Field label="Email" error={errors.email?.message} htmlFor="email">
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field
        label="Password"
        error={errors.password?.message}
        hint={signUp ? "At least 8 characters." : undefined}
        htmlFor="password"
      >
        <Input
          id="password"
          type="password"
          autoComplete={signUp ? "new-password" : "current-password"}
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </Field>
      {error != null && <ErrorState error={error} />}
      <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
        {signUp ? "Create account" : "Log in"}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        {signUp ? "Already have an account?" : "New to Seam?"}{" "}
        <Link href={signUp ? SIGN_IN : SIGN_UP} className="font-medium text-ink underline underline-offset-4">
          {signUp ? "Log in" : "Sign up"}
        </Link>
      </p>
    </form>
  );
}
