# Agent Guide — `src/shared/`

Data fetching, caching, filtering logic, utilities, and TypeScript types.

## Key Files

| File                          | Role                                                      |
| ----------------------------- | --------------------------------------------------------- |
| `constants.ts`                | `DATA_BASE_URL`, `CHUNK_BATCH_SIZE`, `BULK_MODIFIED_DATE` |
| `data.ts`                     | All build-time loaders, caches, and entity resolvers      |
| `paper-filters.ts`            | Derives filter values and options from loaded papers      |
| `paper-filter-definitions.ts` | Static filter field definitions                           |
| `paper-list-controller.ts`    | Client-side paper-list filtering and incremental loading  |
| `paper-detail-paths.ts`       | Maps paper references to URL slugs                        |
| `utils.ts`                    | URL, date, and slug helpers                               |
| `pagefind-client.ts`          | Pagefind search integration                               |
| `saved-searches.ts`           | Saved search logic                                        |
| `responsive-filters-panel.ts` | Responsive filter panel UI behaviour                      |
| `types/`                      | All TypeScript type contracts                             |

## Data Flow

```
DATA_BASE_URL (constants.ts)
  └─ data.ts (loaders, caches, resolvers)
       ├─ paper-filters.ts       ← builds filter values/options for list pages
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

## Pitfalls

- If the mirror adds more than 50 file-content chunks, update `CHUNK_BATCH_SIZE`
- Any route-affecting change to references must preserve existing `routeReference` URLs
