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

/**
 * How much a match found only through a synonym counts against a match of the
 * query as typed.
 */
export const VARIANT_WEIGHT = 0.8;

/**
 * Merges the results of a query and its synonym variants into one list.
 *
 * Raw Pagefind scores are kept and only discounted by `VARIANT_WEIGHT` for
 * matches that came from a variant; a paper found by several queries keeps
 * its best value. The returned objects carry that fused score, so
 * `rankResultsByPaperDate` can blend it with recency as usual.
 *
 * An earlier revision divided each list by its own 10th-best score, because
 * scores differ a lot between queries ("Kita" tops out at ~26,
 * "Kindertagesstätte" at ~131). That broke whenever the query as typed only
 * matched weakly: for "Turnhalle Oberreut" (incidental hits, ~21–35) it
 * inflated those hits to the level of the strong "Sporthalle Oberreut"
 * matches (63–79) and buried them at #27. With raw scores the strong matches
 * win, and on the eval on-topic@10 rose from 0.83 to 0.89. The cost is that a
 * variant with high scores can lead the list; for these synonyms its matches
 * are relevant by construction.
 *
 * Without positive scores there is nothing to compare, so the lists are
 * concatenated: the query as typed first, then whatever the variants add.
 */
export function fuseQueryResults<T extends RankableResult>(
  lists: readonly (readonly T[])[],
  variantWeight = VARIANT_WEIGHT,
): T[] {
  const scored = lists.every((list) =>
    list.every((result) => (result.score ?? 0) > 0),
  );
  const best = new Map<
    string,
    { result: T; score: number; list: number; rank: number }
  >();
  const unkeyed: T[] = [];

  lists.forEach((list, listIndex) => {
    const weight = listIndex === 0 ? 1 : variantWeight;
    list.forEach((result, rank) => {
      if (!result.id) {
        if (listIndex === 0) unkeyed.push(result);
        return;
      }
      const score = scored ? (result.score ?? 0) * weight : 0;
      const current = best.get(result.id);
      if (!current || score > current.score)
        best.set(result.id, {
          result,
          score,
          list: current?.list ?? listIndex,
          rank: current?.rank ?? rank,
        });
    });
  });

  return [
    ...[...best.values()]
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.list - right.list ||
          left.rank - right.rank,
      )
      .map(({ result, score }) => (scored ? { ...result, score } : result)),
    ...unkeyed,
  ];
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
