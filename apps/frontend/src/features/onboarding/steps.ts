/** The pages of first-time setup, in order. The value is the page's address. */
export enum OnboardingStep {
  Resume = "resume",
  About = "about",
  Compensation = "compensation",
  Preferences = "preferences",
  Ready = "ready",
}

interface StepInfo {
  slug: OnboardingStep;
  label: string;
}

export const STEPS: StepInfo[] = [
  { slug: OnboardingStep.Resume, label: "Resume" },
  { slug: OnboardingStep.About, label: "About you" },
  { slug: OnboardingStep.Compensation, label: "Compensation" },
  { slug: OnboardingStep.Preferences, label: "Preferences" },
  { slug: OnboardingStep.Ready, label: "Ready" },
];

/** The step an address names, or undefined when it names none. */
export function stepFor(slug: string): OnboardingStep | undefined {
  return STEPS.find((s) => s.slug === slug)?.slug;
}

export function nextStep(slug: OnboardingStep): string {
  const i = STEPS.findIndex((s) => s.slug === slug);
  return `/onboarding/${STEPS[Math.min(i + 1, STEPS.length - 1)]!.slug}`;
}
