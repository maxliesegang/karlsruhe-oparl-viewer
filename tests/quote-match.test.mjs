import test from "node:test";
import assert from "node:assert/strict";
import { findQuoteRange } from "../src/shared/quote-match.ts";

const slice = (text, range) => range && text.slice(range.start, range.end);

test("a quote is found across line breaks and hyphenation", () => {
  const text =
    "Vorspann.\nDie Gebühren sollen in den Straßen-\nzügen der Oststadt\n-- 1 of 2 --\nmoderat steigen. Rest.";
  const quote =
    "Die Gebühren sollen in den Straßenzügen der Oststadt moderat steigen";
  assert.equal(
    slice(text, findQuoteRange(text, quote)),
    "Die Gebühren sollen in den Straßen-\nzügen der Oststadt\n-- 1 of 2 --\nmoderat steigen",
  );
});

test("typographic quotes, case and m² fold", () => {
  const text = "Es entstehen „Neue Wohnungen“ auf 500 m² Fläche im Quartier.";
  const range = findQuoteRange(
    text,
    'es entstehen "neue wohnungen" auf 500 m2 Fläche',
  );
  assert.equal(
    slice(text, range),
    "Es entstehen „Neue Wohnungen“ auf 500 m² Fläche",
  );
});

test("a truncated quote is found by its opening words", () => {
  const text =
    "Satz eins. Die Verwaltung schlägt vor, das Angebot der Stadtwerke anzunehmen und weiter.";
  const range = findQuoteRange(
    text,
    "Die Verwaltung schlägt vor, das Angebot der Stadtwerke anzunehmen und später etwas anderes …",
  );
  assert.equal(
    slice(text, range),
    "Die Verwaltung schlägt vor, das Angebot der Stadtwerke anzunehmen und",
  );
});

test("a quote that is not there yields nothing", () => {
  assert.equal(
    findQuoteRange(
      "Ganz anderer Text.",
      "Die Verwaltung schlägt vor, etwas zu tun",
    ),
    undefined,
  );
  assert.equal(findQuoteRange("Text", ""), undefined);
});
