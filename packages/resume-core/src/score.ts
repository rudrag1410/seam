
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
