# Agent Guide — `src/shared/`

Data fetching, caching, filtering logic, utilities, and TypeScript types.

## Key Files

| File                            | Role                                                     |
| ------------------------------- | -------------------------------------------------------- |
| `constants.ts`                  | `BULK_MODIFIED_DATE`, `SYNDICATION_BASE_URL`             |
| `file-text-loader.ts`           | Fetches extracted PDF text when a disclosure is opened   |
| `data-source.ts`                | Reads the local data checkout (single files and shards)  |
| `data.ts`                       | All build-time loaders, caches, and entity resolvers     |
| `paper-filters.ts`              | Derives filter values and options from loaded papers     |
| `paper-grouping.ts`             | Paper list ordering and date-group headings              |
| `paper-status.ts`               | Consultation ordering, process status + its consultation |
| `paper-filter-definitions.ts`   | Static filter field definitions                          |
| `paper-list-controller.ts`      | Client-side paper-list filtering and incremental loading |
| `meeting-filters.ts`            | Canonical organization-based meeting filter model        |
| `meeting-filter-definitions.ts` | Meeting filter IDs, URL parameters, and option sets      |
| `meeting-filter-controller.ts`  | Client-side meeting filtering and URL synchronization    |
| `paper-detail-paths.ts`         | Maps paper references to URL slugs                       |
| `meeting-paths.ts`              | Maps OParl meeting IDs to meeting detail routes          |
| `meeting-calendar.ts`           | Serializes one meeting as an RFC 5545 calendar event     |
| `syndication-feeds.ts`          | Feed catalog indexing, labels, and shared feed URL       |
| `utils.ts`                      | URL, date, and slug helpers                              |
| `pagefind-client.ts`            | Pagefind module loading, search types, freshness stats   |
| `pagefind-config.ts`            | Search panel selectors, sort presets, build-time flag    |
| `search-panel-controller.ts`    | Search box behaviour and result card rendering           |
| `saved-searches.ts`             | Saved search logic                                       |
| `responsive-filters-panel.ts`   | Responsive filter panel UI behaviour                     |
| `types/`                        | All TypeScript type contracts                            |

## Data Flow

```
syndication-data/docs (data-source.ts, DATA_LOCAL_DIR)
  └─ data.ts (loaders, caches, resolvers)
       ├─ paper-filters.ts       ← builds filter values/options for list pages
       ├─ meeting-filters.ts     ← builds canonical meeting filter values/options
       └─ paper-detail-paths.ts  ← maps reference → URL slug
```

- All data comes from a checkout of the syndication repository
  (`npm run data:setup`, and a sparse checkout in the deploy workflow). There is
  no network data path — per-record directories have no index file, so they
  cannot be discovered remotely
- The mirror publishes big entities as one JSON document per record
  (`papers/`, `meetings/`, `file-contents/`, `summaries/papers/`) and small ones
  as a single file (`organizations.json`, `paper-stadtteile.json`).
  `loadDirectory()` reads every JSON document in a directory and returns `[]`
  when it does not exist; `loadArray()` tries the single file first and falls
  back to `loadDirectory()`, erroring when neither layout yields records
- Files are read concurrently (`FILE_READ_CONCURRENCY = 64`, exported by
  `data-source.ts` so every bulk read shares one budget)
- District data: `paper-stadtteile.json` is versioned, keyed by paper record
  basename, and separates `primary` from `mentioned` matches. The viewer
  combines both for browsing and uses the published district registry so routes
  remain stable even when a district currently has no matches.
- The bulk import flattened `modified` onto `BULK_MODIFIED_DATE = "2025-03-03"`
  for ~87% of papers (12,228 of 14,004), so anything ordered or bucketed by
  `modified` must fall back to the paper's own `date`. `getPaperYear()` does
  this for the year filter; `paper-grouping.ts` does it for the list, which
  sorts by `comparePapersForList()` and groups genuine modifications by day
  ("Aktualisiert am …") and bulk-imported records by Vorlagendatum month
  ("Vorlage vom …"). Both keys must stay consistent or headings and the year
  filter disagree. The comparator orders groups by the last day they cover so
  each group stays contiguous — the client filter shows one heading per key
- Paper summaries (`summaries/papers/<numeric paper id>.json`) are LLM-generated
  by the scraper and backfilled over time, so most papers have none and every
  consumer must treat them as optional. `loadPaperSummaries()` keys the result
  by each summary's own `id`, which also guards against numeric file names
  repeating across paper namespaces (`vo/1` vs `ag/1`)
- Stable routing key: `paper.routeReference = paper.reference.replaceAll("/", "-")`
  — this mapping must remain stable or all detail page URLs break
- Feed metadata comes from `feed-index.json`; `loadSyndicationFeedCatalog()`
  indexes committee and district feeds for contextual links and `/feeds`
- Extracted PDF text is the one value read from the mirror **twice**: at build
  time via `dataSource.loadText()` so Pagefind can index it, and again in the
  browser via `buildFileTextUrl()` after `integrations/pagefind-lean.mjs` strips
  it from the built HTML. Both must resolve the same document, so the file id
  (`getOParlEntityId()`) and the `file-contents/<id>.txt` layout are a shared
  contract — see `src/components/AGENTS.md`. This is the only runtime dependency
  the viewer has on the mirror staying published; the loader degrades to an
  error message beside the still-working PDF download link

## Adding New Data Fields

1. Add/update the type in `types/`
2. Update the loader/resolver in `data.ts`
3. Surface the field in the relevant component or page

## Adding or Changing List Filters

1. Update `PaperFilterValues` / `PaperFilterOptions` in `types/paper-filters.ts`
2. Update `buildPaperFilterModel()` in `paper-filters.ts`
3. Update filter rendering in `src/components/PaperList.astro`
4. Update client behaviour in `paper-list-controller.ts`
   — filter control IDs must stay in sync (see `src/components/AGENTS.md`)

Meeting filters follow the same separation of concerns: `meeting-filters.ts`
derives stable values from the OParl organization relation,
`MeetingFilters.astro` owns the controls, and
`meeting-filter-controller.ts` only matches rendered data attributes. Keep title
parsing as a fallback for meetings without a resolvable organization; do not
use title variants as the primary organization source.

## Search Result Sorting

- Main search (`/`): Pagefind relevance blended with paper recency by
  `search-ranking.ts`. Pagefind scores every result but exposes dates only as an
  ordering, so a second `{ date: "desc" }` search supplies recency as a rank
  quantile — far cheaper than a `data()` fetch per result. The two multiply, so
  a dominant match cannot be displaced while a plateau of near-equal scores is
  ordered by date outright. Raising `RECENCY_WEIGHT` past ~0.6 starts costing
  genuine top hits; measure against a built index before changing it
- Saved search results (`/suche`): `PAGEFIND_MODIFIED_FIRST_SORT`
  (`{ modified: "desc" }`), so the page reads as a "what changed" feed
- Results render in batches of `SEARCH_RESULT_BATCH_SIZE` (20) with
  IntersectionObserver-driven follow-up batches

## Pitfalls

- Any route-affecting change to references must preserve existing `routeReference` URLs
