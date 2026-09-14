import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCanonicalUrl,
  buildMeetingDescription,
  buildPaperDescription,
  canonicalizePathname,
  truncateForMetaDescription,
} from "../src/shared/seo.ts";

test("a short description passes through untouched", () => {
  assert.equal(
    truncateForMetaDescription("  Kurz   und  knapp "),
    "Kurz und knapp",
  );
});

test("a long description is cut on a word boundary", () => {
  const text = "Wort ".repeat(60);

  const result = truncateForMetaDescription(text);

  assert.ok(result.length <= 160);
  assert.ok(result.endsWith("…"));
  assert.ok(!result.includes("Wor…"));
});

test("canonical pathnames drop the .html the file build emits", () => {
  assert.equal(
    canonicalizePathname("/karlsruhe-oparl-viewer/vorlagen/1234.html"),
    "/karlsruhe-oparl-viewer/vorlagen/1234",
  );
  assert.equal(
    canonicalizePathname("/karlsruhe-oparl-viewer/index.html"),
    "/karlsruhe-oparl-viewer/",
  );
  assert.equal(
    canonicalizePathname("/karlsruhe-oparl-viewer/vorlagen"),
    "/karlsruhe-oparl-viewer/vorlagen",
  );
});

test("canonical URLs are absolute against the configured site", () => {
  const url = buildCanonicalUrl(
    new URL("https://example.test/karlsruhe-oparl-viewer/feeds.html?x=1"),
    new URL("https://maxliesegang.github.io"),
  );

  assert.equal(
    url,
    "https://maxliesegang.github.io/karlsruhe-oparl-viewer/feeds",
  );
});

test("no site config means no canonical link rather than a relative one", () => {
  assert.equal(
    buildCanonicalUrl(new URL("https://example.test/a"), undefined),
    undefined,
  );
});

test("a paper summary wins over the bibliographic fallback", () => {
  const description = buildPaperDescription({
    reference: "2024/0815",
    name: "Radweg Kaiserallee",
    summary: "Die Verwaltung schlägt den Ausbau des Radwegs vor.",
  });

  assert.equal(
    description,
    "Die Verwaltung schlägt den Ausbau des Radwegs vor.",
  );
});

test("without a summary the fallback stays specific to the paper", () => {
  const description = buildPaperDescription({
    reference: "2024/0815",
    name: "Radweg Kaiserallee",
    paperType: "Antrag",
    date: "2024-03-07",
  });

  assert.match(description, /Antrag 2024\/0815/);
  assert.match(description, /Radweg Kaiserallee/);
  assert.match(description, /07\.03\.2024/);
});

test("meeting descriptions name the committee, date and agenda size", () => {
  const description = buildMeetingDescription({
    name: "Gemeinderat",
    start: "2024-03-07T15:30:00+01:00",
    agendaItemCount: 23,
  });

  assert.match(description, /Gemeinderat am 07\.03\.2024/);
  assert.match(description, /23 Tagesordnungspunkte/);
});
