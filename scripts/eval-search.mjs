/**
 * Relevance eval for the paper search. Runs every judged query through
 * `searchPapers()`, the same path users get (recency blend included), against
 * the existing `dist/` index. Needs an index and the local data, not a build.
 *
 *   npm run eval:search
 *   npm run eval:search -- --save scripts/search-eval-baseline.json
 *   npm run eval:search -- --baseline scripts/search-eval-baseline.json
 *   npm run eval:search -- --ranking '{"termSimilarity":3}'
 *
 * Metrics, per query and averaged (see scripts/search-judgments.json):
 * - on@10: share of the top 10 whose title matches `onTopic`
 * - cover: share of all papers whose title matches `onTopic` (taken from the
 *   raw data, not the index) that the search returns at any rank
 * - KI@10 / KI-RR: known-item recall@10 and reciprocal rank of the best one
 *
 * With --baseline it exits 1 if any mean metric drops, so a change can be
 * gated on it.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadNodePagefind } from "./lib/pagefind-node.mjs";
import { parseSearchState, referenceKey } from "../src/shared/search-state.ts";
import { searchPapers } from "../src/shared/pagefind-client.ts";

const root = process.cwd();
const { values: args } = parseArgs({
  options: {
    judgments: { type: "string", default: "scripts/search-judgments.json" },
    baseline: { type: "string" },
    save: { type: "string" },
    ranking: { type: "string" },
  },
});
const METRICS = ["onTopic10", "coverage", "known10", "knownRR"];
const LABELS = ["on@10", "cover", "KI@10", "KI-RR"];

const { pagefind } = await loadNodePagefind(root);
if (args.ranking) await pagefind.options({ ranking: JSON.parse(args.ranking) });

const { queries } = JSON.parse(
  await readFile(resolve(root, args.judgments), "utf8"),
);

/** Every live paper title per reference key, read from the raw data. */
const docs = resolve(
  root,
  process.env.DATA_LOCAL_DIR ?? "syndication-data/docs",
);
const titlesByKey = new Map();
for (const name of await readdir(resolve(docs, "papers"))) {
  if (!name.endsWith(".json")) continue;
  const shard = JSON.parse(
    await readFile(resolve(docs, "papers", name), "utf8"),
  );
  for (const paper of Array.isArray(shard) ? shard : [shard]) {
    if (paper.deleted || !paper.reference) continue;
    const key = referenceKey(paper.reference);
    titlesByKey.set(key, [...(titlesByKey.get(key) ?? []), paper.name ?? ""]);
  }
}

// Resolve references to Pagefind ids through the exact reference filter, so
// ranks are found without fetching a result fragment per paper.
const indexed = (await pagefind.filters()).reference ?? {};
const idCache = new Map();
async function pagefindId(key) {
  if (!indexed[key]) return undefined;
  if (!idCache.has(key)) {
    const { results } = await pagefind.search(null, {
      filters: { reference: key },
    });
    idCache.set(key, results?.[0]?.id);
  }
  return idCache.get(key);
}

const problems = [];
const rows = [];
for (const { q, kind = "topic", onTopic, knownItems = [] } of queries) {
  const results = await searchPapers(
    pagefind,
    parseSearchState(new URLSearchParams({ q })),
  );
  const position = new Map(
    results.map((result, index) => [result.id, index + 1]),
  );
  const row = { q, kind, hits: results.length };

  if (onTopic) {
    const pattern = new RegExp(onTopic, "iu");
    const top = await Promise.all(results.slice(0, 10).map((r) => r.data()));
    row.onTopic10 =
      top.filter((d) => pattern.test(d.meta?.title ?? "")).length / 10;

    const matching = [...titlesByKey]
      .filter(
        ([key, titles]) => indexed[key] && titles.some((t) => pattern.test(t)),
      )
      .map(([key]) => key);
    let found = 0;
    for (const key of matching)
      if (position.has(await pagefindId(key))) found++;
    row.coverage = matching.length ? found / matching.length : 1;
    row.coverageCounts = `${found}/${matching.length}`;
  }

  if (knownItems.length) {
    row.knownRanks = [];
    for (const reference of knownItems) {
      const id = await pagefindId(referenceKey(reference));
      if (!id)
        problems.push(`${q}: known item ${reference} is not in the index`);
      else row.knownRanks.push(position.get(id) ?? null);
    }
    const ranks = row.knownRanks.filter((rank) => rank !== null);
    row.known10 =
      ranks.filter((rank) => rank <= 10).length / (row.knownRanks.length || 1);
    row.knownRR = ranks.length ? 1 / Math.min(...ranks) : 0;
  }
  rows.push(row);
}

/** Means over the queries that define each metric. */
function summarise(list) {
  const out = { queries: list.length };
  for (const metric of METRICS) {
    const values = list
      .map((row) => row[metric])
      .filter((v) => v !== undefined);
    out[metric] = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  }
  return out;
}
const kinds = [...new Set(rows.map((row) => row.kind))].sort();
const summary = {
  all: summarise(rows),
  ...Object.fromEntries(
    kinds.map((kind) => [kind, summarise(rows.filter((r) => r.kind === kind))]),
  ),
};

const baseline = args.baseline
  ? JSON.parse(await readFile(resolve(root, args.baseline), "utf8"))
  : null;
const baseRows = new Map((baseline?.rows ?? []).map((row) => [row.q, row]));
const cell = (value, before) => {
  if (value === undefined || value === null) return "    –".padEnd(12);
  let text = value.toFixed(2).padStart(5);
  if (typeof before === "number" && Math.abs(value - before) >= 0.005)
    text += ` ${value > before ? "+" : ""}${(value - before).toFixed(2)}`;
  return text.padEnd(12);
};

console.log(
  "query".padEnd(24) +
    "kind".padEnd(10) +
    "hits".padStart(5) +
    "  " +
    LABELS.map((label) => label.padStart(5).padEnd(12)).join("") +
    "cover n   known ranks (– = not returned)",
);
for (const row of rows) {
  const before = baseRows.get(row.q) ?? {};
  console.log(
    row.q.slice(0, 23).padEnd(24) +
      row.kind.padEnd(10) +
      String(row.hits).padStart(5) +
      "  " +
      METRICS.map((metric) => cell(row[metric], before[metric])).join("") +
      (row.coverageCounts ?? "").padEnd(10) +
      (row.knownRanks ?? []).map((rank) => rank ?? "–").join(" "),
  );
}
console.log("");
for (const [group, stats] of Object.entries(summary)) {
  const before = baseline?.summary?.[group] ?? {};
  console.log(
    `${group.padEnd(10)} n=${String(stats.queries).padEnd(4)}` +
      METRICS.map((m, i) => `${LABELS[i]} ${cell(stats[m], before[m])}`).join(
        "",
      ),
  );
}

if (problems.length) {
  console.error(`\nJudgment problems:\n  ${problems.join("\n  ")}`);
  process.exitCode = 1;
}

if (args.save) {
  const ranking = args.ranking ? JSON.parse(args.ranking) : null;
  await writeFile(
    resolve(root, args.save),
    JSON.stringify({ ranking, summary, rows }, null, 2) + "\n",
  );
  console.log(`\nSaved to ${args.save}`);
}

if (baseline) {
  const dropped = METRICS.filter((metric) => {
    const now = summary.all[metric];
    const before = baseline.summary?.all?.[metric];
    return (
      typeof now === "number" &&
      typeof before === "number" &&
      now < before - 0.001
    );
  });
  if (dropped.length) {
    console.error(`\nWorse than baseline on: ${dropped.join(", ")}`);
    process.exitCode = 1;
  }
}
