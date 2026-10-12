import createClient from "openapi-fetch";
import { ErrorCode } from "./schema";
import type { paths } from "./schema";

/** Problems the browser finds before or instead of an answer from the API. */
export enum ClientErrorCode {
  Network = "NETWORK",
  Unknown = "UNKNOWN",
  Validation = "CLIENT_VALIDATION",
}

export interface ApiError {
  code: ErrorCode | ClientErrorCode;
  message: string;
  hint?: string | null;
  retryable?: boolean;
}

/** Thrown by `unwrap` so callers and React Query see a typed, user-presentable error. */
export class ApiException extends Error {
  constructor(
    public readonly status: number,
    public readonly error: ApiError,
  ) {
    super(error.message);
  }
}

export function createApi(baseUrl: string) {
  return createClient<paths>({ baseUrl, credentials: "include" });
}

interface Result<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

const NETWORK_FAILURE: ApiError = {
  code: ClientErrorCode.Network,
  message: "We couldn't reach the server.",
  hint: "Check your connection and try again.",
  retryable: true,
};

export const UNKNOWN_FAILURE: ApiError = {
  code: ClientErrorCode.Unknown,
  message: "Something went wrong.",
  retryable: true,
};

export async function unwrap<T>(result: Promise<Result<T>>): Promise<T> {
  let res: Result<T>;
  try {
    res = await result;
  } catch {
    throw new ApiException(0, NETWORK_FAILURE);
  }
  if (res.error !== undefined || !res.response.ok) {
    const body = res.error as { error?: ApiError } | undefined;
    throw new ApiException(res.response.status, body?.error ?? UNKNOWN_FAILURE);
  }
  return res.data as T;
}

/** The codes that mean the job text itself is the problem, so the user can fix it and send again. */
export const JOB_TEXT_CODES: ReadonlySet<ErrorCode> = new Set([
  ErrorCode.JdEmpty,
  ErrorCode.JdNotAJd,
  ErrorCode.JdTooLong,
  ErrorCode.JdTooShort,
  ErrorCode.JdUnreadable,
  ErrorCode.UrlBlocked,
  ErrorCode.UrlInvalid,
  ErrorCode.UrlUnreachable,
]);
