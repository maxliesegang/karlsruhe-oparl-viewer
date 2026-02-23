# Agent Guide — `src/components/`

Reusable UI components. Prefer extending existing components over creating new ones.

## Component Catalog

| Component | Role |
|-----------|------|
| `SiteNavigation.astro` | Top nav — desktop/mobile + overlay |
| `PageContainer.astro` | Shared max-width wrapper |
| `PaperListingPage.astro` | Reusable list-page skeleton (title + intro slot + table) |
| `PapersTable.astro` | Paper rows, metadata text, filter panel mount point |
| `PapersFiltersPanel.astro` | Filter controls panel |
| `FilterSelect.astro` | Reusable dropdown for a single filter |
| `LegacyRedirectPage.astro` | Noindex redirect shell for legacy routes |
| `KeyInfo.astro` | Paper metadata (date, type, reference) — detail page |
| `Consultations.astro` | Meeting consultations list — detail page |
| `AuxiliaryFiles.astro` | File attachments — detail page |
| `StadtteilHint.astro` | District hint — detail page |

## Reuse Rules

- All new list pages should use `PaperListingPage` + `PapersTable`
- Wrap page content in `PageContainer` for consistent max-width
- Use `LegacyRedirectPage` for any `noindex` redirect route
- Use `FilterSelect` for every filter dropdown; do not build ad-hoc selects

## Contracts — Do Not Break

**Filter control IDs** — `papers-table-filters.ts` selects controls by these exact IDs:

```
filter-year  filter-type  filter-org  filter-role  filter-result  filter-stadtteil
```

And reads data from table row `data-*` attributes that match these names.

**Pagefind**
- Wrap interactive list UIs with `data-pagefind-ignore`
- Preserve `data-pagefind-sort` on date metadata in `KeyInfo`

**Internal links**
- Every internal `href` must be prefixed with `import.meta.env.BASE_URL` to work on GitHub Pages

## Adding New Components

- Keep text and labels in German unless a broader i18n change is requested
- If the component appears on list pages, check whether it needs `data-pagefind-ignore`
