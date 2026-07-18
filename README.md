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

- Node.js 24.x recommended
- npm
- A local checkout of the council data (created by `npm run data:setup`)

## Local Development

```bash
npm ci
npm run data:setup # shallow-clone the current shard-based data store once
npm run dev:local
```

Dev server: [http://localhost:4321](http://localhost:4321)

Build and preview:

```bash
npm run build:local
npm run preview
```

Fast validation build (skips Pagefind indexing):

```bash
npm run build:local:quick
```

The upstream repository stores papers and meetings as individual JSON files in
`docs/papers/` and `docs/meetings/`; the former aggregate files no longer exist.
`npm run data:setup` clones that repository into the ignored
`syndication-data/` directory. To refresh it later, run
`git -C syndication-data pull --ff-only`.

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

Local and production builds read the shard directories from
`syndication-data/docs`. The deployment workflow checks out the data repository
there before building. Key implementation points:

- Data endpoint is configured in `src/shared/constants.ts` (`DATA_BASE_URL`).
- Fetching/caching lives in `src/shared/data.ts` (module-scoped caches).
- `routeReference` is derived from `paper.reference` by replacing `/` with `-`.
- Year bucketing uses `getPaperYear()` with bulk-import handling (`BULK_MODIFIED_DATE = "2025-03-03"`).
- File content text is loaded concurrently from `file-contents/`.
- District counts are derived and cached via `getPaperCountsByDistrict()`.

The optional `DATA_SOURCE=remote` mode remains available for aggregate stores, but
the upstream paper and meeting data now uses per-record directories.

## Architecture Notes

- `src/layouts/Layout.astro` provides page shell and global styles.
- `src/components/SiteNavigation.astro` owns nav markup/styles/mobile behavior.
- `src/components/PaperListPage.astro` + `src/components/PageContainer.astro` are shared list-page wrappers.
- `src/components/PaperList.astro` renders paper cards and summary text.
- `src/components/FilterSelect.astro` renders each filter dropdown.
- `src/shared/paper-list-controller.ts` contains client-side filtering and incremental-loading logic.
- `src/shared/paper-filters.ts` builds filter values/options from paper, meeting, and organization data.

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
