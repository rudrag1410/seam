import createClient from "openapi-fetch";
import type { paths } from "./schema";

export type ApiError = {
  code: string;
  message: string;
  hint?: string | null;
  retryable?: boolean;
};

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

type Result<T> = { data?: T; error?: unknown; response: Response };

export async function unwrap<T>(result: Promise<Result<T>>): Promise<T> {
  let res: Result<T>;
  try {
    res = await result;
  } catch {
    throw new ApiException(0, {
      code: "NETWORK",
      message: "We couldn't reach the server.",
      hint: "Check your connection and try again.",
      retryable: true,
    });
  }
  if (res.error !== undefined || !res.response.ok) {
    const body = res.error as { error?: ApiError } | undefined;
    throw new ApiException(
      res.response.status,
      body?.error ?? { code: "UNKNOWN", message: "Something went wrong.", retryable: true },
    );
  }
  return res.data as T;
}
