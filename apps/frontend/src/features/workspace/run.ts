import {
  Intensity,
  type Resume,
  SectionName,
  SessionStatus,
  type TailorCreate,
  type TailorSessionOut,
} from "@seam/api-client";
import { ApiException } from "@/lib/api";
import { isJobTextCode } from "@/lib/errors";
import { LANDING } from "@/lib/routes";
import type { ReviewState } from "../review/store";
import type { JobDraft } from "./JobComposer";

export const NEW_RUN_PATH = LANDING;
export const EMPTY_DRAFT: JobDraft = {
  text: "",
  url: "",
  byUrl: false,
  sections: [SectionName.Summary, SectionName.Skills, SectionName.Experience],
  intensity: Intensity.Balanced,
};

export function sessionPath(id: string): string {
  return `/tailor/${id}`;
}

export function showAddress(path: string): void {
  window.history.replaceState(null, "", path);
}

export function runFromDraft(draft: JobDraft, resume: Resume) {
  return {
    resume,
    jdText: draft.byUrl ? "" : draft.text.trim(),
    jdUrl: draft.byUrl ? draft.url.trim() : null,
    sections: draft.sections,
  };
}

export function createBody(
  draft: JobDraft,
  resumeId: string,
  baseVersionId: string | null,
): TailorCreate {
  return {
    resume_id: resumeId,
    ...(draft.byUrl ? { jd_url: draft.url.trim() } : { jd_text: draft.text.trim() }),
    sections: draft.sections,
    intensity: draft.intensity,
    base_version_id: baseVersionId,
  };
}

export function retryBody(prev: TailorSessionOut): TailorCreate {
  return {
    resume_id: prev.resume_id,
    jd_id: prev.jd_id,
    sections: prev.sections,
    intensity: prev.intensity,
  };
}

export function runFromSession(prev: TailorSessionOut) {
  return { resume: prev.resume, jdText: prev.jd_text, jdUrl: prev.jd_url, sections: prev.sections };
}

export function draftFromRun(
  run: Pick<ReviewState, "jdText" | "jdUrl" | "sections">,
  draft: JobDraft,
): JobDraft {
  return {
    ...draft,
    text: run.jdText,
    url: run.jdUrl ?? "",
    byUrl: !run.jdText && !!run.jdUrl,
    sections: run.sections.length ? run.sections : draft.sections,
  };
}

export function jobProblem(fault: unknown): string | null {
  if (!(fault instanceof ApiException) || !isJobTextCode(fault.error.code)) return null;
  return [fault.error.message, fault.error.hint].filter(Boolean).join(" ");
}

export function isRunning(status: SessionStatus | null | undefined): boolean {
  return status === SessionStatus.Queued || status === SessionStatus.Running;
}
