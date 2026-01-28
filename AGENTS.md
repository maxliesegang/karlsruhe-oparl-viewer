# Guide for Future Programming Agents (updated Jan 28, 2026)

## Project Snapshot

- Name: GemeinderatsRadar (`karlsruhe-oparl-viewer`), Astro + TypeScript static site that surfaces Karlsruhe council papers from an OParl-backed JSON mirror.
- Stack: Astro 5.16.x, TypeScript strict (`astro/tsconfigs/strict`), Node 20.x recommended, npm + `package-lock.json` (stick to npm to avoid lock drift).
- Formatting: Prettier 3 with `prettier-plugin-astro` (`npm run format`).
- Hosting: GitHub Pages via `.github/workflows/deploy.yml` (scheduled 03:00 / 15:00 UTC and on `main` pushes).

## Run Book

- Install: `npm ci` (preferred when lockfile is present) or `npm install`.
- Dev server: `npm run dev` → http://localhost:4321.
- Build: `npm run build` (writes to `dist/`); Preview: `npm run preview`.
- Do not edit generated folders (`dist/`, `.astro/`, `node_modules/`); regenerate instead.
- If build fails offline: data is fetched from the internet during build (see Data Flow).

## Data Flow

- Base endpoint in `src/shared/constants.ts`: `DATA_BASE_URL` points to the public mirror at `karlsruhe-oparl-syndication` on GitHub.
- Loaders in `src/shared/data.ts` fetch and cache papers, meetings, organizations, and file contents. Caches are module-scoped; reuse them.
- File contents arrive in up to 50 chunk files (`CHUNK_BATCH_SIZE = 50`). Increase this if new chunk IDs appear.
- Year bucketing: `BULK_MODIFIED_DATE = "2025-03-03"` marks a bulk import; for papers modified on that date, the year is taken from `paper.date` via `getRelevantYear`.
- `internalReference` is derived from `paper.reference` by replacing `/` with `-`; keep this mapping stable for routes and links.

## Routing & Pages

- `/` → `src/pages/index.astro`: search UI using `astro-pagefind` with German translations.
- `/vorlagen{year}` → `src/pages/vorlagen[year].astro`: static paths generated from `getAllAvailableYears()`, listing papers filtered by `getRelevantYear`.
- `/vorlage/[reference]` → `src/pages/vorlage/[reference].astro`: detail view resolving organizations, consultations, and auxiliary files.
- Layout (`src/layouts/Layout.astro`) computes `latestYear` at build time for the nav link; all internal links must prefix `import.meta.env.BASE_URL` to work on GitHub Pages.

## Components & Utilities

- Core components: `PapersTable`, `YearLinks`, `KeyInfo`, `Consultations`, `AuxiliaryFiles`. Styles are colocated via `<style>` blocks; keep accessibility in mind (e.g., button labels, aria attributes).
- Utilities in `src/shared/utils.ts`: `correctUrl` fixes `/oparl/` → `/ris/oparl/`; date formatters use German locale.
- Types live in `src/shared/types/` and are re-exported through `index.ts`. When adding fields to the data, update types first.

## Code Style & Practices

- Prefer `async/await`; reuse existing fetch/cache helpers instead of new ad-hoc fetches.
- Keep links/base paths relative with `import.meta.env.BASE_URL`.
- Run `npm run format` before committing; Astro + TS files are covered by Prettier.
- Text/UI is German today; keep translation consistency when adding strings.

## Deployment Notes

- GitHub Action uses `withastro/action@v3`; default Node is 20 unless overridden. If you bump Node, update workflow comments/options.
- Pages deployment uses build job artifacts; avoid committing `dist/`.

## Common Pitfalls

- Build needs network access to GitHub raw URLs; offline builds will fail unless `DATA_BASE_URL` is pointed at a local mirror.
- Forgetting the base path breaks navigation/search on GitHub Pages—always use `base = import.meta.env.BASE_URL`.
- If the data mirror adds more than 50 file-content chunks, bump `CHUNK_BATCH_SIZE` or load dynamically.
- Changing `reference` format without updating `internalReference` will 404 detail pages.
- Pagefind: elements marked with `data-pagefind-ignore` are skipped; `KeyInfo` sets `data-pagefind-sort` for date sorting—preserve when refactoring.

## Quick File Map

- `src/pages/*` entry pages and dynamic routes.
- `src/components/*` UI building blocks (table, year links, detail sections).
- `src/shared/data.ts` fetch/caching logic.
- `src/shared/utils.ts` URL/date helpers.
- `src/shared/types/*` data contracts.
- `astro.config.mjs` project-level Astro config.

## When Extending

- Add new data fields → update types → adjust loaders → surface in UI.
- New pages/components → use `Layout` and base-aware links; keep content searchable unless intentionally excluded.
- If you need local/offline data, consider making `DATA_BASE_URL` configurable via env and document the value you used.
