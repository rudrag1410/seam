/** Live score projection. Each suggestion carries a server-computed `score_delta`;
 *  the client adds up the accepted ones so the number moves in the same frame as the click.
 *  The server re-scores authoritatively when you finalize. */

export interface ScoredSuggestion {
  id: string;
  score_delta?: number | null;
}

export function projectScore(
  base: number,
  suggestions: ScoredSuggestion[],
  accepted: ReadonlySet<string>,
): number {
  const gain = suggestions.reduce((sum, s) => sum + (accepted.has(s.id) ? (s.score_delta ?? 0) : 0), 0);
  return Math.max(0, Math.min(100, Math.round((base + gain) * 10) / 10));
}
