/**
 * Blends Pagefind's relevance with paper recency for the main search.
 *
 * Pagefind scores every result (`balanced_score`), but exposes dates only as an
 * ordering — reading the real date of a result costs a fragment fetch, which is
 * far too much for a whole result set. So recency enters as a *rank quantile*
 * over the date-sorted order: newest match 1, oldest 0.
 *
 * The two combine multiplicatively, which is what keeps the correction honest
 * at both ends of the score distribution. Where one match is far stronger than
 * the rest, no amount of freshness can displace it — at `RECENCY_WEIGHT` 0.6 a
 * result must already score 63% of a rival to overtake it on recency alone.
 * Where matches sit on a plateau of near-equal scores — the common case for a
 * broad term, e.g. 4,450 hits for "Klimaschutz" all scoring 10.2–10.3 — the
 * ordering among them is arbitrary, and date then decides it outright.
 *
 * An earlier revision shifted results by a fixed number of positions instead.
 * That could not distinguish those two cases: a 32-place lift buried the one
 * dominant "Datenschutz" match at position 8, yet barely dented the Klimaschutz
 * plateau, because rank gaps say nothing about how far apart the scores are.
 */
const RECENCY_WEIGHT = 0.6;

interface RankableResult {
  id?: string;
  score?: number;
}

export function rankResultsByPaperDate<T extends RankableResult>(
  relevanceResults: readonly T[],
  dateResults: readonly T[],
): T[] {
  if (relevanceResults.length < 2 || dateResults.length < 2) {
    return [...relevanceResults];
  }

  // Without scores there is no scale to blend against, and a multiplicative
  // lift would be meaningless. Relevance order is the honest fallback.
  const scores = relevanceResults.map((result) => result.score ?? 0);
  if (scores.some((score) => score <= 0)) return [...relevanceResults];

  const dateRank = new Map(
    dateResults.flatMap((result, rank) =>
      result.id ? [[result.id, rank] as const] : [],
    ),
  );
  const lastDateRank = dateResults.length - 1;

  return relevanceResults
    .map((result, relevanceRank) => {
      const rank = result.id ? dateRank.get(result.id) : undefined;
      // A result the date sort left out keeps its bare relevance score.
      const freshness =
        rank === undefined ? 0 : (lastDateRank - rank) / lastDateRank;
      return {
        result,
        relevanceRank,
        blendedScore: scores[relevanceRank] * (1 + RECENCY_WEIGHT * freshness),
      };
    })
    .sort(
      (left, right) =>
        right.blendedScore - left.blendedScore ||
        left.relevanceRank - right.relevanceRank,
    )
    .map(({ result }) => result);
}
