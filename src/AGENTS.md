# Agent Guide — `src/`

Source root. See sub-directory guides for focused documentation:

- [`src/pages/`](pages/) — route entrypoints
- [`src/components/`](components/) — UI components
- [`src/shared/`](shared/) — data, filters, types, utilities
- [`src/layouts/Layout.astro`](layouts/Layout.astro) — global page shell

## Pages & Routing

Route entrypoints in `src/pages/`. Each file maps to a URL path.

| File | URL | Notes |
|------|-----|-------|
| `pages/index.astro` | `/` | Search page (Pagefind) |
| `pages/suche.astro` | `/suche` | Alternative search route |
| `pages/vorlagen.astro` | `/vorlagen` | Papers list with filters |
| `pages/vorlagen[year].astro` | `/vorlagen{year}` | Legacy redirect → `/vorlagen?year=…` |
| `pages/vorlagen/[reference].astro` | `/vorlagen/[reference]` | Paper detail page |
| `pages/stadtteile.astro` | `/stadtteile` | District overview |
| `pages/stadtteil/[name].astro` | `/stadtteil/[name]` | Papers for one district |
| `pages/vorlage/[reference].astro` | `/vorlage/[reference]` | Legacy redirect → `/vorlagen/[reference]` |
| `pages/gespeicherte-suchen.astro` | `/gespeicherte-suchen` | Saved searches |

> **Note:** Do not place non-`.astro` files directly inside `src/pages/` — Astro will try to render them as routes.

## URL Contracts

- **All internal hrefs** must be prefixed with `import.meta.env.BASE_URL` (required for GitHub Pages subpath)
- **`internalReference`** — a paper's URL slug is `paper.reference.replaceAll("/", "-")`. This mapping is stable; changing it breaks existing URLs. It is computed in `src/shared/data.ts` and mapped in `src/shared/paper-detail-paths.ts`

## Legacy Redirects

Use `LegacyRedirectPage` (`src/components/LegacyRedirectPage.astro`) for any route that only exists to forward old URLs. It sets `noindex` automatically.

Current legacy routes: `pages/vorlagen[year].astro` and `pages/vorlage/[reference].astro`.

## Adding New Pages

- Reuse `Layout` (shell), `PageContainer` (width), and `PaperListingPage` (list skeleton) from `src/components/`
- Keep labels and copy in German
- If the page hosts an interactive list, wrap it with `data-pagefind-ignore`
