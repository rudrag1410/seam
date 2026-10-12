"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, ChipSelect, Checkbox, Field, Input, Segmented, TagInput } from "@seam/ui";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Lock } from "lucide-react";
import { ErrorState } from "@/components/feedback/states";
import {
  type AboutValues,
  type CompensationValues,
  aboutSchema,
  compensationSchema,
} from "./schema";
import {
  EmploymentType,
  type Preferences,
  type Profile,
  Seniority,
  WorkMode,
} from "@seam/api-client";
import { useSavePreferences, useSaveProfile } from "./hooks";

type Prefill = Record<string, string | number | null | undefined>;

function FromResume() {
  return (
    <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-[11px] font-normal text-ink-muted">
      from resume
    </span>
  );
}

function pick(prefill: Prefill, own: string | null | undefined, key: string): string {
  return own || (prefill[key] as string | undefined) || "";
}

function fromResume(prefill: Prefill, own: string | null | undefined, key: string): boolean {
  return !own && !!prefill[key];
}

function aboutDefaults(profile: Profile, prefill: Prefill): AboutValues {
  return {
    full_name: pick(prefill, profile.full_name, "full_name"),
    phone: pick(prefill, profile.phone, "phone"),
    location: pick(prefill, profile.location, "location"),
    headline: pick(prefill, profile.headline, "headline"),
    current_title: pick(prefill, profile.current_title, "current_title"),
    current_company: pick(prefill, profile.current_company, "current_company"),
    years_experience:
      profile.years_experience ?? (prefill.years_experience as number | undefined) ?? undefined,
    linkedin: pick(prefill, profile.links?.linkedin, "linkedin"),
    github: pick(prefill, profile.links?.github, "github"),
    portfolio: profile.links?.portfolio ?? "",
  };
}

interface AboutFormProps {
  profile: Profile;
  prefill?: Prefill;
  submitLabel?: string;
  onSaved?: () => void;
}

export function AboutForm({
  profile,
  prefill = {},
  submitLabel = "Save",
  onSaved,
}: AboutFormProps) {
  const save = useSaveProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AboutValues>({
    resolver: zodResolver(aboutSchema),
    defaultValues: aboutDefaults(profile, prefill),
  });
  const latest = useRef({ profile, prefill });
  latest.current = { profile, prefill };
  useEffect(
    () => reset(aboutDefaults(latest.current.profile, latest.current.prefill)),
    [
      reset,
      prefill.full_name,
      prefill.email,
      prefill.current_title,
      prefill.headline,
      prefill.years_experience,
    ],
  );

  const onSubmit = handleSubmit(async (v) => {
    const links = Object.fromEntries(
      Object.entries({ linkedin: v.linkedin, github: v.github, portfolio: v.portfolio }).filter(
        ([, x]) => x,
      ),
    ) as Record<string, string>;
    await save.mutateAsync({
      full_name: v.full_name,
      phone: v.phone || null,
      location: v.location || null,
      headline: v.headline || null,
      current_title: v.current_title || null,
      current_company: v.current_company || null,
      years_experience: v.years_experience ?? null,
      links,
    });
    onSaved?.();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Full name"
        error={errors.full_name?.message}
        htmlFor="full_name"
        className="sm:col-span-2"
      >
        <Input id="full_name" {...register("full_name")} aria-invalid={!!errors.full_name} />
      </Field>
      <Field
        label={
          (
            <>
              Current title
              {fromResume(prefill, profile.current_title, "current_title") && <FromResume />}
            </>
          ) as unknown as string
        }
        htmlFor="current_title"
      >
        <Input id="current_title" {...register("current_title")} />
      </Field>
      <Field
        label={
          (
            <>
              Current company
              {fromResume(prefill, profile.current_company, "current_company") && <FromResume />}
            </>
          ) as unknown as string
        }
        htmlFor="current_company"
      >
        <Input id="current_company" {...register("current_company")} />
      </Field>
      <Field
        label={
          (
            <>Headline{fromResume(prefill, profile.headline, "headline") && <FromResume />}</>
          ) as unknown as string
        }
        htmlFor="headline"
        className="sm:col-span-2"
        hint="One line about what you do."
      >
        <Input id="headline" {...register("headline")} />
      </Field>
      <Field label="Location" htmlFor="location">
        <Input id="location" {...register("location")} />
      </Field>
      <Field label="Phone" htmlFor="phone">
        <Input id="phone" type="tel" {...register("phone")} />
      </Field>
      <Field
        label={
          (
            <>
              Years of experience
              {!profile.years_experience && !!prefill.years_experience && <FromResume />}
            </>
          ) as unknown as string
        }
        error={errors.years_experience?.message}
        htmlFor="yoe"
      >
        <Input id="yoe" type="number" step="0.5" min="0" {...register("years_experience")} />
      </Field>
      <span className="hidden sm:block" />
      <Field label="LinkedIn" htmlFor="linkedin">
        <Input id="linkedin" {...register("linkedin")} />
      </Field>
      <Field label="GitHub" htmlFor="github">
        <Input id="github" {...register("github")} />
      </Field>
      <Field label="Portfolio" htmlFor="portfolio" className="sm:col-span-2">
        <Input id="portfolio" {...register("portfolio")} />
      </Field>
      {save.isError && (
        <div className="sm:col-span-2">
          <ErrorState error={save.error} />
        </div>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" loading={save.isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

const CURRENCIES = ["INR", "USD", "EUR", "GBP"];

interface CompensationFormProps {
  profile: Profile;
  submitLabel?: string;
  onSaved?: () => void;
}

export function CompensationForm({
  profile,
  submitLabel = "Save",
  onSaved,
}: CompensationFormProps) {
  const save = useSaveProfile();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CompensationValues>({
    resolver: zodResolver(compensationSchema),
    defaultValues: {
      current_ctc: profile.current_ctc ?? undefined,
      expected_ctc: profile.expected_ctc ?? undefined,
      ctc_currency: profile.ctc_currency,
      notice_period_days: profile.notice_period_days ?? undefined,
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    await save.mutateAsync({
      current_ctc: v.current_ctc ?? null,
      expected_ctc: v.expected_ctc ?? null,
      ctc_currency: v.ctc_currency,
      notice_period_days: v.notice_period_days ?? null,
    });
    onSaved?.();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <p className="flex items-center gap-2 rounded-[12px] bg-cream px-4 py-3 text-sm text-ink-soft sm:col-span-2">
        <Lock className="size-4 shrink-0" aria-hidden />
        Private. Encrypted at rest, never shared, and never sent to AI models.
      </p>
      <Field label="Current CTC (annual)" error={errors.current_ctc?.message} htmlFor="current_ctc">
        <Input id="current_ctc" type="number" min="0" {...register("current_ctc")} />
      </Field>
      <Field
        label="Expected CTC (annual)"
        error={errors.expected_ctc?.message}
        htmlFor="expected_ctc"
      >
        <Input id="expected_ctc" type="number" min="0" {...register("expected_ctc")} />
      </Field>
      <Field label="Currency">
        <Controller
          control={control}
          name="ctc_currency"
          render={({ field }) => (
            <Segmented
              size="sm"
              aria-label="Currency"
              value={field.value}
              onChange={field.onChange}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              className="self-start"
            />
          )}
        />
      </Field>
      <Field
        label="Notice period (days)"
        error={errors.notice_period_days?.message}
        htmlFor="notice"
      >
        <Input id="notice" type="number" min="0" {...register("notice_period_days")} />
      </Field>
      {save.isError && (
        <div className="sm:col-span-2">
          <ErrorState error={save.error} />
        </div>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" loading={save.isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

const SENIORITY = [
  Seniority.Junior,
  Seniority.Mid,
  Seniority.Senior,
  Seniority.Staff,
  Seniority.Lead,
];
const JOB_TYPES = [
  { value: EmploymentType.FullTime, label: "Full-time" },
  { value: EmploymentType.Contract, label: "Contract" },
  { value: EmploymentType.PartTime, label: "Part-time" },
  { value: EmploymentType.Internship, label: "Internship" },
  { value: EmploymentType.Freelance, label: "Freelance" },
];
const WORK_MODES = [
  { value: WorkMode.Remote, label: "Remote" },
  { value: WorkMode.Hybrid, label: "Hybrid" },
  { value: WorkMode.Onsite, label: "Onsite" },
];

interface PreferencesFormProps {
  preferences: Preferences;
  submitLabel?: string;
  onSaved?: () => void;
}

export function PreferencesForm({
  preferences,
  submitLabel = "Save",
  onSaved,
}: PreferencesFormProps) {
  const save = useSavePreferences();
  const [p, setP] = useState<Preferences>(preferences);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await save.mutateAsync(p);
        onSaved?.();
      }}
      className="flex flex-col gap-6"
    >
      <Field label="Target roles" hint="Press Enter to add.">
        <TagInput
          value={p.target_roles ?? []}
          onChange={(v) => setP((s) => ({ ...s, target_roles: v }))}
          placeholder="Senior Frontend Engineer"
          suggestions={[
            "Frontend Engineer",
            "Full Stack Engineer",
            "Backend Engineer",
            "Engineering Manager",
          ]}
        />
      </Field>
      <Field label="Seniority">
        <Segmented
          size="sm"
          aria-label="Seniority"
          className="self-start"
          value={p.seniority ?? Seniority.Unspecified}
          onChange={(v) => setP((s) => ({ ...s, seniority: v }))}
          options={SENIORITY.map((s) => ({ value: s, label: s[0]!.toUpperCase() + s.slice(1) }))}
        />
      </Field>
      <Field label="Job types">
        <ChipSelect
          value={p.job_types ?? []}
          onChange={(v) => setP((s) => ({ ...s, job_types: v }))}
          options={JOB_TYPES}
        />
      </Field>
      <Field label="Work mode">
        <ChipSelect
          value={p.work_modes ?? []}
          onChange={(v) => setP((s) => ({ ...s, work_modes: v }))}
          options={WORK_MODES}
        />
      </Field>
      <Field label="Preferred locations">
        <TagInput
          value={p.locations ?? []}
          onChange={(v) => setP((s) => ({ ...s, locations: v }))}
          placeholder="Bengaluru"
          suggestions={["Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad", "London", "Remote"]}
        />
      </Field>
      <Checkbox
        checked={!!p.open_to_relocation}
        onChange={(v) => setP((s) => ({ ...s, open_to_relocation: v }))}
        label="Open to relocation"
      />
      <Field label="Industries">
        <TagInput
          value={p.industries ?? []}
          onChange={(v) => setP((s) => ({ ...s, industries: v }))}
          placeholder="Fintech"
          suggestions={["Fintech", "Healthtech", "E-commerce", "Developer tools", "AI"]}
        />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Tech you want to work with">
          <TagInput
            value={p.preferred_tech ?? []}
            onChange={(v) => setP((s) => ({ ...s, preferred_tech: v }))}
            placeholder="TypeScript"
          />
        </Field>
        <Field label="Tech you want to avoid">
          <TagInput
            value={p.avoid_tech ?? []}
            onChange={(v) => setP((s) => ({ ...s, avoid_tech: v }))}
            placeholder="PHP"
          />
        </Field>
      </div>
      <Field label="Work authorization" htmlFor="auth">
        <Input
          id="auth"
          value={p.work_authorization ?? ""}
          onChange={(e) => setP((s) => ({ ...s, work_authorization: e.target.value }))}
          placeholder="Citizen, work visa, needs sponsorship…"
        />
      </Field>
      {save.isError && <ErrorState error={save.error} />}
      <div>
        <Button type="submit" size="lg" loading={save.isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
