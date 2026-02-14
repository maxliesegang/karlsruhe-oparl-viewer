# Guide for Future Programming Agents (updated Feb 14, 2026)

## Project Snapshot

- Name: GemeinderatsRadar (`karlsruhe-oparl-viewer`)
- Purpose: Static Astro site for browsing Karlsruhe council papers based on an OParl JSON mirror
- Stack: Astro 5.16.x, TypeScript strict, Node 20.x recommended, npm with `package-lock.json`
- Formatting: Prettier 3 + `prettier-plugin-astro` (`npm run format`)
- Hosting: GitHub Pages via `.github/workflows/deploy.yml` (push to `main`, 03:00 and 15:00 UTC schedule)

## Run Book

- Install: `npm ci` (preferred) or `npm install`
- Dev: `npm run dev` -> `http://localhost:4321`
- Build: `npm run build` (outputs `dist/`)
- Fast build (no Pagefind index): `npm run build:quick`
- Preview: `npm run preview`
- Format: `npm run format`

Do not edit generated artifacts (`dist/`, `.astro/`, `node_modules/`).

## Data Flow

- Base endpoint: `DATA_BASE_URL` in `src/shared/constants.ts`
- Core loaders/caches: `src/shared/data.ts`
- Filter metadata generation: `src/shared/paper-filter-utils.ts`
- Client filter behavior for list pages: `src/shared/papers-table-filters.ts`
- Pagefind toggle: set `SKIP_PAGEFIND=1` to skip `astro-pagefind` integration (used by `npm run build:quick`)
- File contents are loaded from chunk files (`CHUNK_BATCH_SIZE = 50`)
- Year logic: `getRelevantYear()` handles bulk-import date `BULK_MODIFIED_DATE = "2025-03-03"`
- Stable routing key: `paper.internalReference = paper.reference.replaceAll("/", "-")`
- District counts: `getStadtteilCounts()` is cached and reused by district pages

## Routing & Pages

- `/` -> `src/pages/index.astro` (search page)
- `/vorlagen{year}` -> `src/pages/vorlagen[year].astro`
- `/stadtteile` -> `src/pages/stadtteile.astro`
- `/stadtteil/[name]` -> `src/pages/stadtteil/[name].astro`
- `/vorlage/[reference]` -> `src/pages/vorlage/[reference].astro`

## Component Architecture

- `src/layouts/Layout.astro`: global page shell
- `src/components/SiteNavigation.astro`: top nav (desktop/mobile behavior + overlay)
- `src/components/PageContainer.astro`: shared max-width wrapper
- `src/components/PaperListingPage.astro`: reusable list-page skeleton (title + intro slot + table)
- `src/components/PapersTable.astro`: list rows, metadata text, filter panel mount point
- `src/components/FilterSelect.astro`: reusable dropdown for filter controls
- Detail page components:
  - `src/components/KeyInfo.astro`
  - `src/components/Consultations.astro`
  - `src/components/AuxiliaryFiles.astro`
  - `src/components/StadtteilHint.astro`
  - `src/components/YearLinks.astro`

## Important Contracts

- Keep all internal links base-aware: prefix with `import.meta.env.BASE_URL`
- Keep list filter control IDs stable (`filter-type`, `filter-org`, `filter-role`, `filter-result`, `filter-stadtteil`)
  - `src/shared/papers-table-filters.ts` depends on those IDs and table data attributes
- Preserve `data-pagefind-ignore` wrappers around interactive list UIs
- Preserve `data-pagefind-sort` usage in `KeyInfo` when touching date metadata
- Preserve `internalReference` mapping format or detail routes will break

## Deployment Notes

- Workflow: `.github/workflows/deploy.yml`
- Uses `withastro/action@v3` + `actions/deploy-pages@v4`
- Avoid committing `dist/`
- Keep deploy on default `npm run build` so Pagefind assets stay available in production

## Common Pitfalls

- Offline builds fail unless `DATA_BASE_URL` points to a reachable mirror
- Missing `BASE_URL` prefixes breaks GitHub Pages subpath routing
- If the mirror adds more than 50 file-content chunks, update `CHUNK_BATCH_SIZE`
- Any route-affecting change to references must keep compatibility with existing `internalReference` URLs

## Quick File Map

- `src/pages/*` route entrypoints
- `src/components/*` UI components
- `src/layouts/Layout.astro` shell
- `src/shared/data.ts` loader/caching/resolvers
- `src/shared/paper-filter-utils.ts` filter data derivation
- `src/shared/papers-table-filters.ts` client-side list filtering
- `src/shared/utils.ts` URL/date/slug helpers
- `src/shared/types/*` type contracts

## Extension Checklist

- Adding new data fields:
  - Update types in `src/shared/types/*`
  - Update loaders/resolvers in `src/shared/data.ts`
  - Surface data in components/pages
- Adding or changing list filters:
  - Update `PaperFilterData` / `PaperFilterOptions`
  - Update `buildFilterData` in `src/shared/paper-filter-utils.ts`
  - Update filter rendering in `src/components/PapersTable.astro`
  - Update client behavior in `src/shared/papers-table-filters.ts`
- Adding new pages/components:
  - Reuse `Layout`, `PageContainer`, and `PaperListingPage` where applicable
  - Keep text and labels in German unless a broader localization change is requested
