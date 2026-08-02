# Agent Guide — `src/shared/`

Data fetching, caching, filtering logic, utilities, and TypeScript types.

## Key Files

| File                            | Role                                                      |
| ------------------------------- | --------------------------------------------------------- |
| `constants.ts`                  | `DATA_BASE_URL`, `CHUNK_BATCH_SIZE`, `BULK_MODIFIED_DATE` |
| `data.ts`                       | All build-time loaders, caches, and entity resolvers      |
| `paper-filters.ts`              | Derives filter values and options from loaded papers      |
| `paper-filter-definitions.ts`   | Static filter field definitions                           |
| `paper-list-controller.ts`      | Client-side paper-list filtering and incremental loading  |
| `meeting-filters.ts`            | Canonical organization-based meeting filter model         |
| `meeting-filter-definitions.ts` | Meeting filter IDs, URL parameters, and option sets       |
| `meeting-filter-controller.ts`  | Client-side meeting filtering and URL synchronization     |
| `paper-detail-paths.ts`         | Maps paper references to URL slugs                        |
| `meeting-paths.ts`              | Maps OParl meeting IDs to meeting detail routes           |
| `utils.ts`                      | URL, date, and slug helpers                               |
| `pagefind-client.ts`            | Pagefind module loading, search types, freshness stats    |
| `pagefind-config.ts`            | Search panel selectors, sort presets, build-time flag     |
| `search-panel-controller.ts`    | Search box behaviour and result card rendering            |
| `saved-searches.ts`             | Saved search logic                                        |
| `responsive-filters-panel.ts`   | Responsive filter panel UI behaviour                      |
| `types/`                        | All TypeScript type contracts                             |

## Data Flow

```
DATA_BASE_URL (constants.ts)
  └─ data.ts (loaders, caches, resolvers)
       ├─ paper-filters.ts       ← builds filter values/options for list pages
       ├─ meeting-filters.ts     ← builds canonical meeting filter values/options
       └─ paper-detail-paths.ts  ← maps reference → URL slug
```

- File contents are fetched in batches: `CHUNK_BATCH_SIZE = 50`
- District counts: `getStadtteilCounts()` is cached and reused by district pages
- `getPaperYear()` handles the bulk-import date `BULK_MODIFIED_DATE = "2025-03-03"`
- Stable routing key: `paper.routeReference = paper.reference.replaceAll("/", "-")`
  — this mapping must remain stable or all detail page URLs break

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

- Main search (`/`): plain Pagefind relevance, no sort option
- Saved search results (`/suche`): `PAGEFIND_MODIFIED_FIRST_SORT`
  (`{ modified: "desc" }`), so the page reads as a "what changed" feed
- Results render in batches of `SEARCH_RESULT_BATCH_SIZE` (20) with
  IntersectionObserver-driven follow-up batches

## Pitfalls

- If the mirror adds more than 50 file-content chunks, update `CHUNK_BATCH_SIZE`
- Any route-affecting change to references must preserve existing `routeReference` URLs
