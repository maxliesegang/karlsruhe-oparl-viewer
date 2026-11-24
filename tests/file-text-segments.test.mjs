import test from "node:test";
import assert from "node:assert/strict";
import {
  getFileTextStats,
  normalizeQuery,
  segmentFileText,
} from "../src/shared/file-text-segments.ts";

test("without a query the text stays one run", () => {
  assert.deepEqual(segmentFileText("Ein Text.\nZweite Zeile."), [
    { kind: "text", text: "Ein Text.\nZweite Zeile." },
  ]);
});

test("page markers become page segments", () => {
  const text = "Seite eins\n-- 1 of 2 --\nSeite zwei\n-- 2 of 2 --";
  assert.deepEqual(segmentFileText(text), [
    { kind: "text", text: "Seite eins\n" },
    { kind: "page", page: 1, total: 2 },
    { kind: "text", text: "\nSeite zwei\n" },
    { kind: "page", page: 2, total: 2 },
  ]);
});

test("matches are case-insensitive and keep the original spelling", () => {
  assert.deepEqual(
    segmentFileText("Der Gemeinderat und der gemeinderat", "GEMEINDERAT"),
    [
      { kind: "text", text: "Der " },
      { kind: "match", text: "Gemeinderat" },
      { kind: "text", text: " und der " },
      { kind: "match", text: "gemeinderat" },
    ],
  );
});

test("a phrase matches across a line break", () => {
  const matches = segmentFileText(
    "die Kriegs-\nstraße und\ndie Brücke",
    "und die",
  ).filter((segment) => segment.kind === "match");
  assert.deepEqual(matches, [{ kind: "match", text: "und\ndie" }]);
});

test("regex characters in the query are literal", () => {
  const matches = segmentFileText("Kosten (netto) 3.5 Mio.", "(netto)").filter(
    (segment) => segment.kind === "match",
  );
  assert.deepEqual(matches, [{ kind: "match", text: "(netto)" }]);
});

test("a one-character query is ignored", () => {
  assert.equal(normalizeQuery(" a "), "");
  assert.deepEqual(segmentFileText("aaa", "a"), [
    { kind: "text", text: "aaa" },
  ]);
});

test("stats count words without page markers and read the page total", () => {
  assert.deepEqual(
    getFileTextStats("Eins zwei\n-- 1 of 3 --\ndrei\n-- 2 of 3 --"),
    { words: 3, pages: 3 },
  );
  assert.deepEqual(getFileTextStats("Ohne Marker"), {
    words: 2,
    pages: undefined,
  });
  assert.deepEqual(getFileTextStats("  "), { words: 0, pages: undefined });
});
