import { ApiException } from "@seam/api-client";

export interface Presentable {
  title: string;
  hint?: string;
  retryable: boolean;
}

/** Every backend error has a stable `code`; this maps codes to copy and recovery hints. */
const COPY: Record<string, Partial<Presentable>> = {
  FILE_TYPE_UNSUPPORTED: { hint: "Resumes must be PDF or DOCX files." },
  FILE_TOO_LARGE: { hint: "Export a smaller copy and try again." },
  PDF_PASSWORD_PROTECTED: { hint: "Export an unlocked copy and upload that." },
  JD_NOT_A_JD: { hint: "Paste the job posting you want to tailor for." },
  LLM_UNAVAILABLE: { hint: "Your inputs are saved. Try again in a minute.", retryable: true },
  NETWORK: { hint: "Check your connection and try again.", retryable: true },
  INVALID_CREDENTIALS: { hint: "Check your email and password." },
};

export function presentError(err: unknown): Presentable {
  if (err instanceof ApiException) {
    const extra = COPY[err.error.code] ?? {};
    return {
      title: err.error.message,
      hint: err.error.hint ?? extra.hint,
      retryable: err.error.retryable ?? extra.retryable ?? false,
    };
  }
  if (err instanceof Error) return { title: err.message, retryable: true };
  return { title: "Something went wrong.", retryable: true };
}
