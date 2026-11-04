# Search quality plan

Status: proposed (2026-11-03). Scope: result quality of the Pagefind paper
search. Not in scope: UI, filters, the index-then-strip pipeline.

## Decision: stay on Pagefind

Pagefind's chunked index is what makes a static search over ~14k papers and
~270 MB of extracted PDF text possible: the browser loads only the chunks for
the typed terms. Every in-browser alternative (Orama, MiniSearch, FlexSearch,
Lunr) loads the whole index, and Stork is unmaintained. Meilisearch or Typesense
would add typo tolerance and synonyms out of the box, but they need a server.
That trade only makes sense if the project gives up being fully static.

## Measured baseline

Probed against the current `dist/pagefind` (1.5.2, `de`, 13,911 pages) through
the same Node bootstrap as `scripts/verify-search-index.mjs`.

**Ranking is already good for topic queries.** Proxy metric: share of the top 10
whose title contains the topic, over 12 typical queries (Radweg, Kita,
Klimaschutz, Spielplatz, Straßenbahn, Lärmschutz, Wohnungsbau, Baumfällung,
Parkplätze, Schwimmbad, Haushalt, Digitalisierung):

| Ranking options                        | title-hit@10 |
| -------------------------------------- | ------------ |
| defaults                               | 112/120      |
| `pageLength: 0.3`                      | 112/120      |
| `termSaturation: 0.8`                  | 113/120      |
| `termSimilarity: 3`                    | 114/120      |
| `pageLength: 0.3, termSaturation: 1.0` | 111/120      |

Tuning moves almost nothing. The proxy is crude (it ignores relevant papers
with off-topic titles), so this rules out big wins, not small ones.

**The gap is recall: other words for the same thing.** Pagefind matches word
prefixes and German stems but has no synonyms and cannot match inside a
compound. Multi-word queries are AND.

| Query A              | Query B                 | B-papers A misses |
| -------------------- | ----------------------- | ----------------- |
| Kita (786)           | Kindertagesstätte (708) | 303               |
| ÖPNV (1132)          | Nahverkehr (386)        | 119               |
| Radweg (789)         | Fahrradweg (150)        | 41                |
| Bebauungsplan (1560) | B-Plan (357)            | 41                |
| Schule (3807)        | Grundschule (957)       | 99                |

`Schwimmbad` has the weakest top 10 (5/10). Its stem does not reach
`Schwimmbäder`, `Hallenbad` or `Freibad`. `ß`/`ss` already folds
(`Strassenbahn` = `Straßenbahn`, 1039 each).

## Review of the earlier suggestions

| Suggestion                                              | Verdict                                                                                                                                                                                                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tune `ranking` options                                  | Demoted. Measured effect ≈ 0. Revisit only through the eval in step 1. Client-side only, so it never needs a rebuild.                                                                                                                           |
| Inject compound parts / synonyms as hidden indexed text | Rejected in that form. Indexed text lands in the fragment `content`, so injected tokens would show up in excerpts and grow the 121 MB of fragments. Use query-side expansion first (step 2), and an indexed meta field only if needed (step 4). |
| Strip PDF boilerplate before indexing                   | Deferred. No evidence yet that it hurts ranking, and it needs a full rebuild to try.                                                                                                                                                            |
| Typo suggestions                                        | Deferred. Low value next to the synonym gap.                                                                                                                                                                                                    |
| Build an eval set first                                 | Kept, and cheaper than expected: it runs against the existing `dist/` without a build.                                                                                                                                                          |

What already works well and must not regress: exact reference lookup, the
multiplicative recency blend (`search-ranking.ts`), `ß`/`ss` folding, and
filter-before-fragment loading.

## Steps

### 1. Relevance eval (no build) — done 2026-11-03

- `scripts/lib/pagefind-node.mjs` loads the production bundle in Node. It is
  shared by `verify-search-index.mjs` and `eval-search.mjs`.
- `npm run eval:search` runs 26 judged queries from
  `scripts/search-judgments.json` through `searchPapers()`, recency blend
  included, in about 15 s. Flags: `--baseline <file>` (diff, exits 1 on a drop
  in any mean metric), `--save <file>`, `--ranking '<json>'` for step 3.
- Metrics. A first version measured recall against a few hand-picked papers
  per query. That punished good results: for "Kita" the top 10 was all Kita
  papers, just not the six picked ones. So now:
  - **on@10**: share of the top 10 whose title matches the query's `onTopic`
    regex (synonyms included).
  - **cover**: share of all papers whose title matches `onTopic`, read from the
    raw data rather than the index, that the search returns at any rank. This
    is the synonym/compound gap.
  - **KI@10 / KI-RR**: known items, set only on specific queries such as
    "Kita Weinbrennerplatz" for a paper titled "Kindertagesstätte …". On broad
    queries one paper's rank says little.
- Baseline (`scripts/search-eval-baseline.json`):

  | group        | on@10 | cover | KI@10 | KI-RR |
  | ------------ | ----- | ----- | ----- | ----- |
  | all (26)     | 0.81  | 0.70  | 0.65  | 0.46  |
  | synonym (8)  | 0.88  | 0.53  | 0.27  | 0.12  |
  | compound (5) | 0.80  | 0.54  | 0.44  | 0.21  |
  | topic (8)    | 0.85  | 0.78  | 1.00  | 0.88  |
  | combined (5) | 0.60  | 1.00  | 0.87  | 0.63  |

  This confirms the diagnosis: plain topic queries are fine, synonym and
  compound queries are not. "ÖPNV Grötzingen", "Schwimmbad Grötzingen" and
  "Spielplatz Jasminweg" don't return their paper at all.

- Open: the `onTopic` patterns and known items are seeded from titles and
  encode opinions (should "ÖPNV" cover Straßenbahn papers?). Review them before
  you rely on small differences.

Ranking-option check with the eval: `termSimilarity: 3` gives KI-RR +0.06
and on@10 +0.01. `termSaturation: 0.8` and `pageLength: 0.3` are slightly
worse. Treat this as input to step 3, not a decision, since 26 queries is a
small sample.

### 2. Query-side synonym expansion (no build) — done 2026-11-03

- `src/shared/search-synonyms.ts` holds the hand-made list: equivalent
  words that expand both ways (Kita ↔ Kindertagesstätte, ÖPNV ↔ Nahverkehr,
  obdachlos ↔ wohnungslos, with their common inflections), and one-way entries
  (Schwimmbad → Hallenbad/Freibad/Schwimmbäder, Radweg → Fahrradweg,
  Spielplatz → Kinderspielplatz, Kita → Kindergarten, B-Plan → Bebauungsplan).
  Only exact whole words expand, so partially typed words never do. At most 4
  variants, each replacing one word.
- `searchPapers()` runs the query and its variants with the same filters and
  merges them with `fuseQueryResults` (`search-ranking.ts`): raw Pagefind
  scores, variants weighted ×0.8, and a paper found more than once keeps its
  best value. One browse search over the same filters supplies the date or
  `changed` order. Relevance uses it for the recency blend; explicit sorts use
  it directly. Queries without a list entry and exact references take the
  unchanged single-search path.
- Changes from the plan:
  - B-Plan became one-way. The reverse variant "b-plan" is split at the
    hyphen, and "b" + "plan" matches almost everything; it cost "Bebauungsplan
    Durlach" an on-topic hit. The same rule now covers every hyphenated
    variant (E-Mobilität, PV-Anlage).
  - Per-list score scaling was dropped (see the review below).
- First result (26 queries):

  | group        | cover       | KI@10       | KI-RR       |
  | ------------ | ----------- | ----------- | ----------- |
  | all (26)     | 0.70 → 0.78 | 0.65 → 0.84 | 0.46 → 0.71 |
  | synonym (8)  | 0.53 → 0.79 | 0.27 → 0.73 | 0.12 → 0.57 |
  | compound (5) | 0.54 → 0.56 | 0.44 → 0.78 | 0.21 → 0.83 |

  Topic and combined queries are unchanged; on@10 stays at 0.81. "ÖPNV
  Grötzingen", "Schwimmbad Grötzingen" and "Spielplatz Jasminweg" now find
  their paper at #1–2. The variant weight barely matters between 0.6 and 1.0.

- Cost: expanded queries load 1–2 more index chunks (~100 KiB) and take about
  0.4 s longer in Node on broad words (Kita: 0.2 → 0.6 s). Other queries cost
  nothing extra.
- Not solved: "Schulsanierung" (cover 0.10). Its papers say "Sanierung der
  Grundschule", which a synonym list cannot reach. That is step 4 territory.

#### Synonym review (2026-11-04)

Every candidate pair was measured by how many papers the variant adds that the
typed word misses, plus a sample of those papers.

- Removed: Schwimmbad → Schwimmbäder. The stemmer already joins them (adds 0),
  so it only cost a search.
- Added, both ways: Ampel ↔ Lichtsignalanlage, Zebrastreifen ↔
  Fußgängerüberweg, Gehweg ↔ Fußweg, Flüchtlinge ↔ Geflüchtete, Parkplatz ↔
  Stellplatz, Turnhalle ↔ Sporthalle, Ladesäule ↔ Ladestation ↔
  Ladeinfrastruktur, Grünfläche ↔ Grünanlage, Toilette ↔ WC, Photovoltaik ↔
  Solar ↔ PV.
- Added, one way: Müll → Abfall, Bürgersteig → Gehweg, Tram → Straßenbahn /
  Stadtbahn, Hbf → Hauptbahnhof, Lastwagen → LKW, KVV → Verkehrsverbund,
  VBK → Verkehrsbetriebe, Fahrrad → Radverkehr, E-Mobilität →
  Elektromobilität, Asylbewerber → Flüchtlinge / Geflüchtete, Solaranlage →
  Photovoltaik / PV.
- Rejected, with the reason recorded in `search-synonyms.ts`:
  - Abfall → Müll: "müll" prefix-matches the surname Müller.
  - Schwimmbad → Bäder: +5,085, mostly via "Baden".
  - Senioren → ältere: +4,251 papers of noise.
  - WLAN → Hotspot: Klima-Hotspots.
  - Kfz/Pkw → Auto: Autobahn, Automotive.
  - Bürgerbeteiligung ↔ Öffentlichkeitsbeteiligung: procedural wording in
    every Bebauungsplan.
  - Straßenbahn ↔ Stadtbahn: different systems in Karlsruhe.
  - Haushalt → Doppelhaushalt, Wohnraum → Wohnungsbau, Sozialwohnung,
    E-Scooter, Graffiti: noisy or no gain.
- Before the list changed, 17 judged queries were added for the new entries:
  8 topic queries and 9 known items whose title uses the other word, such as
  "Ampel Wettersbach" for a paper titled "Lichtsignalanlagen …". None of the 9
  was found before.
- **The fusion was wrong.** Dividing each list by its own 10th-best score
  assumed the typed query and its variant match equally well. For "Turnhalle
  Oberreut" the typed query only has incidental matches (energy reports,
  ~21–35); scaling inflated them to the level of the strong "Sporthalle
  Oberreut" matches (63–79), which sank to #27. Raw scores fix that and raise
  on@10 from 0.83 to 0.89. Two known items dropped from #1 to #2/#3 under raw
  scores, but in both cases an equally relevant sibling paper took the place
  (three "Kindertagesstätte am Weinbrennerplatz" papers, and "Geh- und Radweg
  der Ottostraße"). The "Turnhalle Oberreut" known items were also incomplete
  (about ten papers share the title) and were corrected.
- Variant weight under raw scores: 0.5/0.65/0.8/1.0 give KI-RR
  0.68/0.73/0.74/0.78, with identical on@10 and cover. The differences are ties
  between sibling papers, so the eval cannot separate the weights; 0.8 is kept
  as the conservative choice for one-way variants.
- Result (43 queries, `scripts/search-eval-baseline.json`):

  | group        | on@10       | cover       | KI@10       | KI-RR       |
  | ------------ | ----------- | ----------- | ----------- | ----------- |
  | all (43)     | 0.82 → 0.89 | 0.75 → 0.84 | 0.55 → 0.92 | 0.46 → 0.74 |
  | synonym (25) | 0.87 → 0.99 | 0.72 → 0.89 | 0.26 → 0.95 | 0.21 → 0.75 |

  The "before" column is the step 2 code with the 43 queries. Topic and
  combined groups are unchanged.

### 3. Ranking options, gated by the eval — done 2026-11-04, no change

Swept on top of the reviewed synonym list (43 queries, one option at a time,
against `scripts/search-eval-baseline.json`):

| option                                    | on@10 | KI@10 | KI-RR | gate |
| ----------------------------------------- | ----- | ----- | ----- | ---- |
| defaults (baseline)                       | 0.89  | 0.92  | 0.74  |      |
| `termSimilarity: 2`                       | 0.89  | 0.91  | 0.80  | fail |
| `termSimilarity: 3`                       | 0.89  | 0.92  | 0.80  | pass |
| `termSimilarity: 5`                       | 0.88  | 0.92  | 0.81  | fail |
| `termSaturation: 1.0`                     | 0.89  | 0.90  | 0.74  | fail |
| `termSaturation: 2.0`                     | 0.89  | 0.91  | 0.79  | fail |
| `pageLength: 0.5`                         | 0.88  | 0.91  | 0.74  | fail |
| `pageLength: 1.0`                         | 0.88  | 0.90  | 0.75  | fail |
| `termFrequency: 0.5`                      | 0.89  | 0.91  | 0.78  | fail |
| `termFrequency: 1.5`                      | 0.89  | 0.92  | 0.74  | pass |
| `metaWeights: {title: 10}`                | 0.89  | 0.91  | 0.78  | fail |
| `metaWeights: {title: 2}`                 | 0.86  | 0.91  | 0.67  | fail |
| `metaWeights: {paper-organizations: 0.3}` | 0.89  | 0.92  | 0.74  | pass |

Cover is 0.84 in every row. Two settings pass the gate but change nothing.
Only `termSimilarity: 3` passes with a gain (KI-RR +0.06), and it showed the
same +0.06 before synonym expansion. Per query, it is a trade-off, not a win:

- Half the gain is sibling ties ("Kita Weinbrennerplatz", "Radweg
  Ottostraße": another equally relevant paper of the same series was #1).
- Real gains: Schwimmbad (KI-RR +0.30), Schulsanierung (+0.50), Bebauungsplan
  Durlach (+0.08).
- Real losses: "Turnhalle Oberreut" (−0.50; "Sporthallenneubau …" falls from
  #5 to #17) and "Parkplatz Satzung" ("Stellplatzsatzung" #5 → #7).

`termSimilarity` penalises words that match only by prefix, which in German is
how compounds are found. That prefix reach is one of the few things that work
for German here, so the defaults stay. Revisit with a larger judged set: the
differences are one or two queries each, inside the noise of 43 queries.

### 4. Indexed compound terms (needs a build; only if step 2 is not enough)

- If the eval still shows compound misses that a synonym list cannot cover
  (open-ended `…radweg`, `…schule` compounds): at build time, split title and
  summary compounds against a small German lexicon. Emit the parts as one
  `data-pagefind-meta="terms:…"` and give it a low weight with `metaWeights`.
- Meta fields are indexed but do not appear in `content`, so excerpts stay
  clean. Measure fragment growth (`du -sh dist/pagefind/fragment`, now
  121 MB) and index growth (96 MB).

### Later / not planned

- "Meinten Sie …?" on zero results, from a build-time term list.
- PDF boilerplate stripping, only if the eval shows header/footer noise in top
  results.
- Server-backed search (Meilisearch/Typesense), only if the project accepts
  a runtime service.

## Order and cost

Steps 1–3 run against the existing `dist/` and need no rebuild. Step 4 is the
only one that needs a full build, which is why it comes last and is optional.
