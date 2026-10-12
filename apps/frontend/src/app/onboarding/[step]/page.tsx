"use client";

import type { UserOut } from "@seam/api-client";
import { Button, Skeleton } from "@seam/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Stepper } from "@/features/onboarding/Stepper";
import { OnboardingStep, nextStep, stepFor } from "@/features/onboarding/steps";
import { AboutForm, CompensationForm, PreferencesForm } from "@/features/profile/forms";
import { Dropzone, ResumeCard } from "@/features/upload/Dropzone";
import { api, unwrap } from "@/lib/api";
import { LANDING } from "@/lib/routes";
import { keys, usePreferences, usePrimaryResume, useProfile } from "@/lib/queries";

interface StepFrameProps {
  slug: OnboardingStep;
  title: string;
  body: string;
  children: ReactNode;
  skippable?: boolean;
}

function StepFrame({ slug, title, body, children, skippable = true }: StepFrameProps) {
  return (
    <>
      <Stepper current={slug} />
      <h1 className="font-display mt-10 text-[40px] sm:text-[48px]">{title}</h1>
      <p className="mt-3 mb-8 max-w-lg text-ink-soft">{body}</p>
      {children}
      {skippable && (
        <Link
          href={nextStep(slug)}
          className="mt-6 inline-block text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          Skip for now
        </Link>
      )}
    </>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-[72px]" />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { step } = useParams<{ step: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const slug = stepFor(step);
  const resume = usePrimaryResume();
  const profile = useProfile();
  const prefs = usePreferences();
  const complete = useMutation({
    mutationFn: () => unwrap(api.POST("/v1/me/onboarding/complete")),
    onSuccess: async () => {
      qc.setQueryData<UserOut>(keys.me, (me) =>
        me ? { ...me, onboarded: true, has_resume: true } : me,
      );
      await qc.refetchQueries({ queryKey: keys.me });
      router.push(LANDING);
    },
  });
  if (!slug) notFound();

  switch (slug) {
    case OnboardingStep.Resume:
      return (
        <StepFrame
          slug={slug}
          skippable={false}
          title="Start with your resume"
          body="Upload it first and we'll fill in the rest for you. You'll just confirm the details."
        >
          {resume.data ? (
            <div className="flex flex-col gap-4">
              <ResumeCard resume={resume.data} />
              <Dropzone compact onUploaded={() => undefined} />
              <Button size="lg" className="self-start" onClick={() => router.push(nextStep(slug))}>
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : (
            <Dropzone onUploaded={() => router.push(nextStep(slug))} />
          )}
        </StepFrame>
      );
    case OnboardingStep.About:
      return (
        <StepFrame
          slug={slug}
          title="Confirm your details"
          body="We pulled these from your resume. Fix anything that's off."
        >
          {profile.data ? (
            <AboutForm
              profile={profile.data}
              prefill={resume.data?.prefill}
              submitLabel="Continue"
              onSaved={() => router.push(nextStep(slug))}
            />
          ) : (
            <FormSkeleton />
          )}
        </StepFrame>
      );
    case OnboardingStep.Compensation:
      return (
        <StepFrame
          slug={slug}
          title="Compensation"
          body="So we can flag roles that pay below what you're looking for. Optional."
        >
          {profile.data ? (
            <CompensationForm
              profile={profile.data}
              submitLabel="Continue"
              onSaved={() => router.push(nextStep(slug))}
            />
          ) : (
            <FormSkeleton />
          )}
        </StepFrame>
      );
    case OnboardingStep.Preferences:
      return (
        <StepFrame
          slug={slug}
          title="What are you looking for?"
          body="Everything here is optional and editable later. It powers the fit check on each job."
        >
          {prefs.data ? (
            <PreferencesForm
              preferences={prefs.data}
              submitLabel="Continue"
              onSaved={() => router.push(nextStep(slug))}
            />
          ) : (
            <FormSkeleton />
          )}
        </StepFrame>
      );
    case OnboardingStep.Ready:
      return (
        <StepFrame
          slug={slug}
          skippable={false}
          title="You're set"
          body="Paste a job description and Seam will propose edits to your resume. You review every one."
        >
          <Button size="lg" loading={complete.isPending} onClick={() => complete.mutate()}>
            Tailor for your first job <ArrowRight className="size-4" />
          </Button>
        </StepFrame>
      );
  }
}
