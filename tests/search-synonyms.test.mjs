import test from "node:test";
import assert from "node:assert/strict";
import {
  expandQuery,
  MAX_QUERY_VARIANTS,
} from "../src/shared/search-synonyms.ts";
import { fuseQueryResults } from "../src/shared/search-ranking.ts";
import { parseSearchState } from "../src/shared/search-state.ts";
import { searchPapers } from "../src/shared/pagefind-client.ts";

const state = (values) => parseSearchState(new URLSearchParams(values));
const result = (id, score) => ({ id, score });

test("equivalent words expand both ways, case-insensitively", () => {
  assert.deepEqual(expandQuery("Kita"), ["kindertagesstätte", "kindergarten"]);
  assert.deepEqual(expandQuery("Kindertagesstätte"), ["kita", "kindergarten"]);
  assert.deepEqual(expandQuery("ÖPNV"), ["nahverkehr"]);
  assert.deepEqual(expandQuery("nahverkehr"), ["öpnv"]);
});

test("one-way entries do not expand in reverse", () => {
  assert.deepEqual(expandQuery("Radweg"), ["fahrradweg"]);
  assert.deepEqual(expandQuery("Fahrradweg"), []);
  assert.deepEqual(expandQuery("Hallenbad"), []);
  assert.deepEqual(expandQuery("B-Plan"), ["bebauungsplan"]);
  assert.deepEqual(expandQuery("Bebauungsplan"), []);
});

test("each variant replaces one word and keeps the others", () => {
  assert.deepEqual(expandQuery("ÖPNV  Grötzingen"), ["nahverkehr grötzingen"]);
  assert.deepEqual(expandQuery("Kita ÖPNV"), [
    "kindertagesstätte öpnv",
    "kindergarten öpnv",
    "kita nahverkehr",
  ]);
});

test("partial words and unknown words never expand", () => {
  assert.deepEqual(expandQuery("Kit"), []);
  assert.deepEqual(expandQuery("Kitaplätze"), []);
  assert.deepEqual(expandQuery("Klimaschutz"), []);
  assert.deepEqual(expandQuery(""), []);
});

test("variants are capped", () => {
  const variants = expandQuery("Schwimmbad Kita ÖPNV");
  assert.equal(variants.length, MAX_QUERY_VARIANTS);
  assert.deepEqual(variants, [
    "hallenbad kita öpnv",
    "freibad kita öpnv",
    "schwimmbad kindertagesstätte öpnv",
    "schwimmbad kindergarten öpnv",
  ]);
});

test("everyday words point to official terms, never the reverse", () => {
  assert.deepEqual(expandQuery("Müll"), ["abfall"]);
  assert.deepEqual(expandQuery("Abfall"), []);
  assert.deepEqual(expandQuery("Bürgersteig"), ["gehweg"]);
  assert.deepEqual(expandQuery("Tram"), ["straßenbahn", "stadtbahn"]);
  assert.deepEqual(expandQuery("Straßenbahn"), []);
  assert.deepEqual(expandQuery("Ampel"), ["lichtsignalanlage"]);
  assert.deepEqual(expandQuery("Lichtsignalanlage"), ["ampel"]);
  assert.deepEqual(expandQuery("Solaranlage"), ["photovoltaik", "pv"]);
});

test("stemmed plurals are not issued as extra variants", () => {
  // Pagefind's stemmer already joins Schwimmbäder and Schwimmbad.
  assert.ok(!expandQuery("Schwimmbad").includes("schwimmbäder"));
  assert.deepEqual(expandQuery("Schwimmbäder"), ["hallenbad", "freibad"]);
});

test("fusion keeps raw scores, so strong variant matches beat weak typed ones", () => {
  // "Turnhalle Oberreut": the typed query only has incidental matches, the
  // "Sporthalle Oberreut" variant has the real papers.
  const typed = [result("energy-report", 35), result("priorities", 21)];
  const variant = [result("sporthalle", 63), result("energy-report", 30)];
  const fused = fuseQueryResults([typed, variant], 0.8);
  assert.deepEqual(
    fused.map((r) => r.id),
    ["sporthalle", "energy-report", "priorities"],
  );
  assert.equal(fused[0].score, 63 * 0.8);
});

test("a paper found by several queries appears once with its best score", () => {
  const fused = fuseQueryResults(
    [
      [result("a", 10), result("b", 5)],
      [result("b", 20), result("c", 10)],
    ],
    0.8,
  );
  // b = max(5, 20 × 0.8) = 16, c = 10 × 0.8 = 8.
  assert.deepEqual(
    fused.map((r) => [r.id, r.score]),
    [
      ["b", 16],
      ["a", 10],
      ["c", 8],
    ],
  );
});

test("fusion keeps the result objects' own fields and lazy data", () => {
  const data = async () => ({ url: "/x" });
  const [fused] = fuseQueryResults([[{ id: "x", score: 3, data }]]);
  assert.equal(fused.data, data);
});

test("without scores, fusion concatenates in query order", () => {
  const fused = fuseQueryResults([
    [{ id: "a" }, { id: "b" }],
    [{ id: "b" }, { id: "c" }],
  ]);
  assert.deepEqual(
    fused.map((r) => r.id),
    ["a", "b", "c"],
  );
});

function fakeModule(byTerm, browseOrder) {
  const calls = [];
  return {
    calls,
    module: {
      filters: async () => ({ reference: { "2024-123": 1 } }),
      search: async (term, options) => {
        calls.push({ term, options });
        if (term === null)
          return { results: browseOrder.map((id) => ({ id })) };
        return { results: byTerm[term] ?? [] };
      },
    },
  };
}

test("searchPapers merges variants with the same filters", async () => {
  const { module, calls } = fakeModule(
    {
      Kita: [result("a", 26), result("b", 25)],
      kindertagesstätte: [result("c", 131)],
      kindergarten: [],
    },
    ["c", "x", "b", "a"],
  );
  const found = await searchPapers(
    module,
    state({ q: "Kita", type: "Antrag" }),
  );
  assert.deepEqual(new Set(found.map((r) => r.id)), new Set(["a", "b", "c"]));
  assert.deepEqual(
    calls.map((c) => c.term),
    ["Kita", "kindertagesstätte", "kindergarten", null],
  );
  for (const call of calls) assert.equal(call.options.filters.type, "Antrag");
  assert.deepEqual(calls.at(-1).options.sort, { date: "desc" });
});

test("explicit sorts order the merged set by the browse order", async () => {
  const byTerm = {
    ÖPNV: [result("a", 10)],
    nahverkehr: [result("b", 10), result("c", 9)],
  };
  const date = fakeModule(byTerm, ["c", "x", "a", "b"]);
  const byDate = await searchPapers(
    date.module,
    state({ q: "ÖPNV", sort: "date" }),
  );
  assert.deepEqual(
    byDate.map((r) => r.id),
    ["c", "a", "b"],
  );

  const modified = fakeModule(byTerm, ["b", "a", "c"]);
  await searchPapers(modified.module, state({ q: "ÖPNV", sort: "modified" }));
  assert.deepEqual(modified.calls.at(-1).options.sort, { changed: "asc" });
});

test("exact reference lookups never expand", async () => {
  const { module, calls } = fakeModule({}, []);
  await searchPapers(module, state({ q: "2024/123" }));
  assert.equal(calls.length, 1);
});
