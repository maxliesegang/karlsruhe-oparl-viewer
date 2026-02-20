# GemeinderatsRadar

GemeinderatsRadar is an Astro static site that makes Karlsruhe council papers easier to browse and search.  
It builds from an OParl-based JSON mirror and publishes to GitHub Pages.

## Live Site

[https://maxliesegang.github.io/karlsruhe-oparl-viewer/](https://maxliesegang.github.io/karlsruhe-oparl-viewer/)

## What It Does

- Full-text search on the landing page via `astro-pagefind` (German UI copy).
- Browse papers on one page (`/vorlagen`) with a year filter (`?year=YYYY`).
- Browse papers by district (`/stadtteile`, `/stadtteil/[name]`).
- Filter list pages by year, type, organization, role, result, and mentioned district.
- Open paper detail pages with key metadata, consultations, and auxiliary files.

## Stack

- Astro 5 (`astro build`, static output)
- TypeScript (strict via `astro/tsconfigs/strict`)
- `astro-pagefind`
- Prettier 3 + `prettier-plugin-astro`
- npm (`package-lock.json` is authoritative)

## Requirements

- Node.js 20.x recommended
- npm
- Internet access during build (content is fetched from GitHub Raw)

## Local Development

```bash
npm ci
npm run dev
```

Dev server: [http://localhost:4321](http://localhost:4321)

Build and preview:

```bash
npm run build
npm run preview
```

Fast validation build (skips Pagefind indexing):

```bash
npm run build:quick
```

Format:

```bash
npm run format
```

## Routes

- `/` -> search page
- `/vorlagen` -> papers list with filters (including `year` query param)
- `/vorlagen{year}` -> legacy redirect to `/vorlagen?year={year}`
- `/vorlagen/[reference]` -> paper details
- `/stadtteile` -> district overview
- `/stadtteil/[name]` -> papers for one district
- `/vorlage/[reference]` -> legacy redirect to `/vorlagen/[reference]`

## Data Flow

The build reads from:

`https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs`

Key implementation points:

- Data endpoint is configured in `src/shared/constants.ts` (`DATA_BASE_URL`).
- Fetching/caching lives in `src/shared/data.ts` (module-scoped caches).
- `internalReference` is derived from `paper.reference` by replacing `/` with `-`.
- Year bucketing uses `getRelevantYear()` with bulk-import handling (`BULK_MODIFIED_DATE = "2025-03-03"`).
- File content text is loaded from chunk files (`CHUNK_BATCH_SIZE = 50`).
- District counts are derived and cached via `getStadtteilCounts()`.

Offline builds fail unless `DATA_BASE_URL` is pointed to a reachable local mirror.

## Architecture Notes

- `src/layouts/Layout.astro` provides page shell and global styles.
- `src/components/SiteNavigation.astro` owns nav markup/styles/mobile behavior.
- `src/components/PaperListingPage.astro` + `src/components/PageContainer.astro` are shared list-page wrappers.
- `src/components/PapersTable.astro` renders paper rows and metadata.
- `src/components/FilterSelect.astro` renders each filter dropdown.
- `src/shared/papers-table-filters.ts` contains client-side filtering logic.
- `src/shared/paper-filter-utils.ts` builds filter metadata/options from paper + meeting/org data.

## Deployment

GitHub Pages deployment is configured in `.github/workflows/deploy.yml`:

- On push to `main`
- On schedule at `03:00` and `15:00` UTC
- Via `withastro/action@v3` + `actions/deploy-pages@v4`
- Uses the default `npm run build` (Pagefind enabled)

Do not commit generated output (`dist/`).

## Contributing

1. Create a feature branch.
2. Keep links base-aware with `import.meta.env.BASE_URL`.
3. Run `npm run format`.
4. Run `npm run build` if you touched page/data logic.

## License

[MIT](LICENSE)
