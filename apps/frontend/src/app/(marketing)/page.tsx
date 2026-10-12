import { buttonClass } from "@seam/ui";
import { ArrowRight, FileCheck2, GitCompareArrows, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { MockReview, MockScore } from "@/features/marketing/MockProduct";
import { Showcase } from "@/features/marketing/Showcase";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Nothing gets invented",
    body: "Every suggestion is checked against your real experience. New numbers and technologies are flagged for you to confirm before they go anywhere near your resume.",
  },
  {
    icon: GitCompareArrows,
    title: "Reviewable, not automatic",
    body: "Changes show up as tracked edits in your resume. Accept all, some or none, undo any decision, and keep each tailored version to compare later.",
  },
  {
    icon: FileCheck2,
    title: "Built for the screening pass",
    body: "Plain single-column exports, an explainable match score and an ATS check with concrete fixes, so the right person actually sees it.",
  },
];

const FAQ = [
  [
    "Do you rewrite my whole resume?",
    "No. Seam edits individual lines and leaves everything else untouched, so nothing drifts or gets reworded behind your back.",
  ],
  [
    "What if the job asks for a skill I don't have?",
    "Seam never writes it into a bullet. It suggests adding it as a skill only if it's true, and tells you the gap so you can decide.",
  ],
  [
    "Is my compensation data shared?",
    "It's encrypted at rest and never sent to any AI model. Fit checks compare it in code, on our server.",
  ],
];

export default function Landing() {
  return (
    <>
      <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden gap-8 text-[15px] text-ink-muted md:flex" aria-label="Primary">
            <a href="#how" className="hover:text-ink">
              How it works
            </a>
            <a href="#why" className="hover:text-ink">
              Why Seam
            </a>
            <a href="#faq" className="hover:text-ink">
              FAQ
            </a>
          </nav>
          <div className="flex gap-2">
            <Link href="/sign-in" className={buttonClass("secondary", "md")}>
              Log in
            </Link>
            <Link href="/sign-up" className={buttonClass("primary", "md")}>
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-[1200px] px-4 pt-20 pb-20 text-center sm:px-6 sm:pt-28 sm:pb-28">
          <h1 className="font-display mx-auto max-w-4xl text-[48px] sm:text-[72px]">
            Tailor your resume to the job. Keep every word true.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-ink-soft">
            Paste a job description. Seam proposes specific edits right in your resume. You accept,
            reject or rewrite each one.
          </p>
          <div className="mx-auto mt-9 flex max-w-xs flex-col justify-center gap-3 sm:max-w-none sm:flex-row">
            <Link href="/sign-up" className={buttonClass("primary", "lg")}>
              Tailor my resume <ArrowRight className="size-4" />
            </Link>
            <a href="#how" className={buttonClass("secondary", "lg")}>
              See how it works
            </a>
          </div>
        </section>

        <section id="how" className="mx-auto grid max-w-[1200px] gap-4 px-4 sm:px-6 md:grid-cols-2">
          <div className="rounded-[8px] bg-panel p-6 sm:p-8">
            <p className="text-[22px] leading-tight tracking-[-0.02em] text-ink-muted">1. Review</p>
            <p className="text-[22px] leading-tight font-medium tracking-[-0.02em]">
              Edits appear in your resume
            </p>
            <div className="mt-8">
              <MockReview />
            </div>
          </div>
          <div className="rounded-[8px] bg-panel p-6 sm:p-8">
            <p className="text-[22px] leading-tight tracking-[-0.02em] text-ink-muted">
              2. Measure
            </p>
            <p className="text-[22px] leading-tight font-medium tracking-[-0.02em]">
              See why it matches, and by how much
            </p>
            <div className="mt-8">
              <MockScore />
            </div>
          </div>
        </section>

        <div className="py-24 sm:py-32">
          <Showcase />
        </div>

        <section id="why" className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6 sm:pb-32">
          <div className="grid gap-10 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <span className="grid size-10 place-items-center rounded-full bg-cream">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <h3 className="mt-5 text-2xl leading-[1.17] font-medium tracking-[-0.022em]">
                  {title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 sm:pb-32">
          <h2 className="text-center text-[32px] leading-[1.1] font-medium tracking-[-0.03em] sm:text-[40px]">
            Questions
          </h2>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[17px] font-medium tracking-[-0.01em]">
                  {q}
                  <span
                    className="text-ink-muted transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6">
          <div className="rounded-[8px] bg-panel px-6 py-20 text-center sm:py-28">
            <h2 className="font-display mx-auto max-w-2xl text-[40px] sm:text-[56px]">
              Stop sending the same resume.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-ink-soft">
              Free to try. Your resume and job descriptions stay private to you.
            </p>
            <Link href="/sign-up" className={`${buttonClass("primary", "lg")} mt-8`}>
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-muted sm:px-6">
          <Logo className="text-ink" />
          <p>Built with ❤️</p>
        </div>
      </footer>
    </>
  );
}
