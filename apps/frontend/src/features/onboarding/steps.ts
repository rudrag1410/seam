export const STEPS = [
  { slug: "resume", label: "Resume" },
  { slug: "about", label: "About you" },
  { slug: "compensation", label: "Compensation" },
  { slug: "preferences", label: "Preferences" },
  { slug: "ready", label: "Ready" },
] as const;

export type StepSlug = (typeof STEPS)[number]["slug"];

export function nextStep(slug: StepSlug): string {
  const i = STEPS.findIndex((s) => s.slug === slug);
  return `/onboarding/${STEPS[Math.min(i + 1, STEPS.length - 1)]!.slug}`;
}
