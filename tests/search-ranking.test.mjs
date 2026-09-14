import assert from "node:assert/strict";
import test from "node:test";
import { rankResultsByPaperDate } from "../src/shared/search-ranking.ts";

/** A plateau of near-equal scores, as broad terms produce in the real index. */
function makePlateau(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index),
    score: 10.3 - index * 0.0001,
  }));
}

test("date decides the order within a plateau of near-equal scores", () => {
  const relevance = makePlateau(100);
  const byDate = [...relevance.slice(60), ...relevance.slice(0, 60)];

  const ranked = rankResultsByPaperDate(relevance, byDate);

  assert.equal(ranked[0], relevance[60]);
  // The whole tail of the relevance order moves ahead of its head.
  assert.ok(ranked.indexOf(relevance[99]) < ranked.indexOf(relevance[0]));
});

test("a dominant match keeps first place however recent its rivals are", () => {
  const relevance = [
    { id: "dominant", score: 80.4 },
    ...makePlateau(50).map((result) => ({
      id: `plateau-${result.id}`,
      score: result.score,
    })),
  ];
  // Every rival is newer than the dominant match, which is the oldest of all.
  const byDate = [...relevance.slice(1), relevance[0]];

  assert.equal(rankResultsByPaperDate(relevance, byDate)[0], relevance[0]);
});

test("recency cannot overtake a rival scoring more than 1 / (1 + weight)", () => {
  const newest = { id: "newest", score: 62 };
  const older = { id: "older", score: 100 };
  const relevance = [older, newest];

  // 62 * 1.6 = 99.2 — just short of 100, so the stronger match holds.
  assert.deepEqual(rankResultsByPaperDate(relevance, [newest, older]), [
    older,
    newest,
  ]);

  const stronger = { id: "newest", score: 64 };
  assert.deepEqual(
    rankResultsByPaperDate([older, stronger], [stronger, older]),
    [stronger, older],
  );
});

test("an unavailable date sort leaves the relevance order unchanged", () => {
  const relevance = [
    { id: "one", score: 3 },
    { id: "two", score: 2 },
    { id: "three", score: 1 },
  ];

  assert.deepEqual(rankResultsByPaperDate(relevance, []), relevance);
});

test("results without a score fall back to the relevance order", () => {
  const relevance = [{ id: "one" }, { id: "two" }, { id: "three" }];

  assert.deepEqual(
    rankResultsByPaperDate(relevance, [...relevance].reverse()),
    relevance,
  );
});

test("papers the date sort omits keep their bare relevance score", () => {
  const relevance = makePlateau(10);
  // The top match is undated; every other match is dated and therefore lifted.
  const byDate = relevance.slice(1).reverse();

  const ranked = rankResultsByPaperDate(relevance, byDate);

  assert.equal(ranked[0], relevance[9]);
  // Unlifted, it falls behind every dated rival — but its score still places it
  // ahead of the oldest of them, which earns no lift either.
  assert.deepEqual(ranked.slice(-2), [relevance[0], relevance[1]]);
});

test("equally fresh results stay in relevance order", () => {
  const relevance = [
    { id: "a", score: 30 },
    { id: "b", score: 20 },
    { id: "c", score: 10 },
  ];

  assert.deepEqual(rankResultsByPaperDate(relevance, relevance), relevance);
});
