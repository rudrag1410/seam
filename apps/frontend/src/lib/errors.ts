import { ApiError, ApiException, ClientErrorCode, ErrorCode, JOB_TEXT_CODES } from "@seam/api-client";

export interface Presentable {
  title: string;
  hint?: string;
  retryable: boolean;
}

/** Every backend error has a stable `code`; this maps codes to copy and recovery hints. */
const COPY: Partial<Record<ApiError["code"], Partial<Presentable>>> = {
  [ErrorCode.FileTypeUnsupported]: { hint: "Resumes must be PDF or DOCX files." },
  [ErrorCode.FileTooLarge]: { hint: "Export a smaller copy and try again." },
  [ErrorCode.PdfPasswordProtected]: { hint: "Export an unlocked copy and upload that." },
  [ErrorCode.JdNotAJd]: { hint: "Paste the job posting you want to tailor for." },
  [ErrorCode.LlmUnavailable]: { hint: "Your inputs are saved. Try again in a minute.", retryable: true },
  [ClientErrorCode.Network]: { hint: "Check your connection and try again.", retryable: true },
  [ErrorCode.InvalidCredentials]: { hint: "Check your email and password." },
};

/** True for the errors that mean the job text itself is the problem, so the user can fix it and resend. */
export function isJobTextCode(code: ApiError["code"]): boolean {
  return JOB_TEXT_CODES.has(code as ErrorCode);
}

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
