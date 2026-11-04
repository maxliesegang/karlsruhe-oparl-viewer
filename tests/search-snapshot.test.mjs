import test from "node:test";
import assert from "node:assert/strict";
import { parseSearchState } from "../src/shared/search-state.ts";
import { searchPapers } from "../src/shared/pagefind-client.ts";
import {
  buildSearchSnapshot,
  injectSearchSnapshot,
  isSnapshotView,
} from "../src/shared/search-snapshot.ts";

const state = (values) => parseSearchState(new URLSearchParams(values));

test("only the unfiltered newest-change view is served from the snapshot", () => {
  assert.equal(isSnapshotView(state({})), true);
  assert.equal(isSnapshotView(state({ sort: "modified" })), true);
  assert.equal(isSnapshotView(state({ sort: "date" })), false);
  assert.equal(isSnapshotView(state({ q: "Radweg" })), false);
  assert.equal(isSnapshotView(state({ district: "Durlach" })), false);
  assert.equal(isSnapshotView(state({ year: "2024" })), false);
});

test("the snapshot keeps card fields, extracts the summary and drops page text", async () => {
  const calls = [];
  const fragment = (n) => ({
    url: `/vorlagen/${n}.html`,
    meta: { title: `Vorlage ${n}`, "paper-reference": `2026/${n}` },
    content: "Titel Zusammenfassung. KI-generiert. Kurz gesagt. Kernpunkte. X",
    anchors: [
      { id: "paper-summary", location: 1 },
      { id: "next", location: 7 },
    ],
  });
  const module = {
    filters: async () => assert.fail("the browse view needs no filter lists"),
    search: async (term, options) => {
      calls.push({ term, options });
      return {
        results: [1, 2, 3].map((n) => ({ data: async () => fragment(n) })),
      };
    },
  };
  const snapshot = await buildSearchSnapshot(module, 2);
  assert.deepEqual(calls, [
    { term: null, options: { filters: {}, sort: { changed: "asc" } } },
  ]);
  assert.equal(snapshot.total, 3);
  assert.deepEqual(snapshot.results[0], {
    url: "/vorlagen/1.html",
    meta: { title: "Vorlage 1", "paper-reference": "2026/1" },
    summary: "Kurz gesagt.",
  });
  assert.equal(snapshot.results.length, 2);
});

test("injection fills only the empty placeholder and cannot close the script", () => {
  const html =
    '<p>x</p><script type="application/json" data-search-snapshot></script>';
  const snapshot = { total: 1, results: [{ summary: "</script><b>$&" }] };
  const filled = injectSearchSnapshot(html, snapshot);
  assert.equal(filled.match(/<\/script>/g).length, 1);
  const json = filled.match(/data-search-snapshot>(.*)<\/script>/)[1];
  assert.deepEqual(JSON.parse(json), snapshot);
  assert.equal(injectSearchSnapshot(filled, snapshot), undefined);
  assert.equal(injectSearchSnapshot("<p>x</p>", snapshot), undefined);
});

test("text searches skip the filter lists unless the query may be a reference", async () => {
  let loaded = 0;
  const module = {
    filters: async () => (loaded++, { reference: {} }),
    search: async () => ({ results: [] }),
  };
  await searchPapers(module, state({ q: "Radweg Durlach" }));
  await searchPapers(module, state({ district: "Durlach" }));
  assert.equal(loaded, 0);
  await searchPapers(module, state({ q: "2026/0847" }));
  await searchPapers(module, state({ q: "dhh-2023-1007" }));
  await searchPapers(module, state({ year: "2024" }));
  assert.equal(loaded, 3);
});
