"use client";

import { Segmented } from "@seam/ui";
import { useState } from "react";
import { MockExport, MockReview, MockScore } from "./MockProduct";

const TABS = {
  review: {
    title: "Every edit is a proposal",
    body: "Seam reads the posting the way a recruiter would, then suggests specific changes inline, like tracked changes. Accept, reject or rewrite each one.",
    visual: <MockReview />,
  },
  score: {
    title: "A score that shows its work",
    body: "Each requirement is rated against your resume, so you can see exactly why a role is a 64 and what moves it to an 81. It updates as you accept edits.",
    visual: <MockScore />,
  },
  export: {
    title: "Plain, ATS-safe exports",
    body: "One column, real headings, selectable text. Download PDF, DOCX or plain text, with an estimated ATS score and fix-it hints.",
    visual: <MockExport />,
  },
} as const;

type Tab = keyof typeof TABS;

export function Showcase() {
  const [tab, setTab] = useState<Tab>("review");
  const t = TABS[tab];
  return (
    <section className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <div className="rounded-[8px] bg-panel px-4 py-16 text-center sm:px-10 sm:py-24">
        <h2 className="mx-auto max-w-2xl text-[32px] leading-[1.1] font-medium tracking-[-0.03em] sm:text-[40px]">
          For everyone making
          <br />
          their next move
        </h2>
        <Segmented
          className="mt-8"
          aria-label="Feature"
          value={tab}
          onChange={setTab}
          options={[
            { value: "review", label: "Review" },
            { value: "score", label: "Score" },
            { value: "export", label: "Export" },
          ]}
        />
        <div className="mx-auto mt-12 grid max-w-5xl items-center gap-10 text-left md:grid-cols-2 md:gap-16">
          <div key={tab} className="animate-fade-in">
            <h3 className="text-2xl leading-[1.17] font-medium tracking-[-0.022em]">{t.title}</h3>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">{t.body}</p>
          </div>
          <div key={`${tab}-v`} className="animate-rise">
            {t.visual}
          </div>
        </div>
      </div>
    </section>
  );
}
