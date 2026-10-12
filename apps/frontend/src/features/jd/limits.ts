export const MIN_JD_CHARS = 300;
/** Mirrors the server's LLM_MAX_JD_TOKENS (4,000 tokens, about 16,000 characters). The server enforces it. */
export const MAX_JD_CHARS = 16_000;

export function jdProblem(chars: number): string | null {
  if (chars === 0) return null;
  if (chars < MIN_JD_CHARS) return `${MIN_JD_CHARS - chars} more characters needed.`;
  if (chars > MAX_JD_CHARS) return `${(chars - MAX_JD_CHARS).toLocaleString()} characters over the limit. Paste just the posting.`;
  return null;
}
