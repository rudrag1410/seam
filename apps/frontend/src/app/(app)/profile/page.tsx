"use client";

import { Button, Skeleton } from "@seam/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageBody, PageHeader } from "@/components/shell/PageHeader";
import { AboutForm, CompensationForm, PreferencesForm } from "@/features/profile/forms";
import { Dropzone, ResumeCard } from "@/features/upload/Dropzone";
import { api, unwrap } from "@/lib/api";
import { presentError } from "@/lib/errors";
import { usePreferences, usePrimaryResume, useProfile } from "@/lib/queries";

interface SectionProps {
  title: string;
  body?: string;
  children: React.ReactNode;
}

function Section({ title, body, children }: SectionProps) {
  return (
    <section className="border-t border-line py-10 first:border-0 first:pt-0">
      <h2 className="text-2xl font-medium tracking-[-0.022em]">{title}</h2>
      {body && <p className="mt-1 mb-6 text-ink-soft">{body}</p>}
      {children}
    </section>
  );
}

export default function ProfilePage() {
  const profile = useProfile();
  const resume = usePrimaryResume();
  const prefs = usePreferences();
  const [replacing, setReplacing] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: () => unwrap(api.DELETE("/v1/me")),
    onSuccess: () => { qc.clear(); router.replace("/"); },
    onError: (e) => toast.error(presentError(e).title),
  });

  return (
    <PageBody>
      <PageHeader title="Profile" />
      <Section title="Master resume" body="Every tailored resume is a view of this one.">
        {resume.data && !replacing ? (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><ResumeCard resume={resume.data} /></div>
            <Button variant="secondary" size="sm" onClick={() => setReplacing(true)}>Replace</Button>
          </div>
        ) : (
          <Dropzone compact onUploaded={() => { setReplacing(false); toast.success("Resume updated"); }} />
        )}
      </Section>
      <Section title="About you">
        {profile.data ? <AboutForm profile={profile.data} prefill={resume.data?.prefill} submitLabel="Save details" onSaved={() => toast.success("Details saved")} /> : <Skeleton className="h-[672px]" />}
      </Section>
      <Section title="Compensation">
        {profile.data ? <CompensationForm profile={profile.data} submitLabel="Save compensation" onSaved={() => toast.success("Compensation saved")} /> : <Skeleton className="h-[279px]" />}
      </Section>
      <Section title="What you're looking for" body="Each job is checked against this, and mismatches are flagged on the fit check.">
        {prefs.data ? (
          <PreferencesForm preferences={prefs.data} submitLabel="Save preferences" onSaved={() => toast.success("Preferences saved")} />
        ) : (
          <Skeleton className="h-[926px]" />
        )}
      </Section>
      <Section title="Delete my data" body="Removes your account, resumes, versions and exported files. This can't be undone.">
        <Button
          variant="outline" loading={remove.isPending}
          onClick={() => { if (confirm("Delete your account and all data? This can't be undone.")) remove.mutate(); }}
        >
          Delete everything
        </Button>
      </Section>
    </PageBody>
  );
}
