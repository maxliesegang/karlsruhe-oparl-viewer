# Agent Guide — `src/components/`

Reusable UI components. Prefer extending existing components over creating new ones.

## Component Catalog

| Component                  | Role                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| `SiteNavigation.astro`     | Top nav — desktop/mobile + overlay                                |
| `SiteFooter.astro`         | Site context and external data/source links                       |
| `Breadcrumbs.astro`        | Canonical hierarchy on detail and scoped list pages               |
| `PageContainer.astro`      | Shared max-width wrapper (`width="wide" \| "narrow"`)             |
| `PaperListPage.astro`      | Reusable list-page skeleton (title + intro slot + list)           |
| `PaperList.astro`          | Paper cards, summary text, filter panel mount point               |
| `PaperFilters.astro`       | Filter controls panel                                             |
| `FilterSelect.astro`       | Reusable dropdown for a single filter                             |
| `MeetingFilters.astro`     | Meeting-specific filter controls and status                       |
| `SearchPanel.astro`        | Pagefind search box + rich result cards (custom UI)               |
| `LegacyRedirectPage.astro` | Noindex redirect shell for legacy routes                          |
| `PaperHeader.astro`        | Detail-page title block: reference, type, status, date            |
| `PaperFacts.astro`         | "Eckdaten" sidebar card — modified, bodies, submitters, districts |
| `PaperSummary.astro`       | LLM summary + key points, rendered only when one exists           |
| `AuxiliaryFiles.astro`     | File attachments — detail page                                    |
| `StadtteilHint.astro`      | District hint — detail page                                       |
| `MeetingAgenda.astro`      | Public agenda with links to matching papers                       |
| `PaperTimeline.astro`      | Paper lifecycle, consultations, and decisions                     |
| `RelatedPapers.astro`      | Parent, amendment, and follow-up paper links                      |

## Reuse Rules

- All new list pages should use `PaperListPage` + `PaperList`
- Wrap page content in `PageContainer` for consistent max-width
- Use `LegacyRedirectPage` for any `noindex` redirect route
- Use `FilterSelect` for every filter dropdown; do not build ad-hoc selects

## Contracts — Do Not Break

**Filter control IDs** — `paper-list-controller.ts` selects controls by these exact IDs:

```
filter-year  filter-type  filter-org  filter-role  filter-result  filter-stadtteil
```

And reads data from table row `data-*` attributes that match these names.

Meeting filter IDs are defined in `src/shared/meeting-filter-definitions.ts`:

`meeting-filter-body-type` · `meeting-filter-organization` ·
`meeting-filter-district` · `meeting-filter-time-range` ·
`meeting-filter-agenda` · `meeting-filter-search` · `meeting-filter-reset`

On the meeting list, `meeting-filter-body-type` is the always-visible segmented
control. The remaining meeting filters live in the collapsible advanced panel.

**Pagefind**

- Wrap interactive list UIs with `data-pagefind-ignore`
- Preserve `data-pagefind-sort` on date metadata (`date:` in `PaperHeader`,
  `modified:` in `PaperFacts`)
- Search results are rendered by `SearchPanel.astro` +
  `search-panel-controller.ts` against the Pagefind JS API — the
  `astro-pagefind` `<Search>` component is intentionally not used
- Result cards read these `data-pagefind-meta` names. Each lives on the element
  that actually displays the value, so the detail page never shows it twice:
  `PaperHeader` sets `paper-reference` · `paper-type` · `paper-date`;
  `PaperFacts` sets `paper-organizations` · `paper-submitters` · `paper-districts` ·
  `paper-modified` · `paper-created`
  (`paper-created` uses the literal `name:value` form so the raw timestamp
  stays out of search excerpts)
- Panel markup contract (selectors in `pagefind-config.ts`):
  `data-search-panel` (with `data-base-url` + `data-sort-mode`) ·
  `data-search-form` · `data-search-input` · `data-search-clear` ·
  `data-search-status` · `data-search-results` · `data-search-empty` ·
  `data-search-load-trigger`

**Internal links**

- Every internal `href` must be prefixed with `import.meta.env.BASE_URL` to work on GitHub Pages

## Adding New Components

- Keep text and labels in German unless a broader i18n change is requested
- If the component appears on list pages, check whether it needs `data-pagefind-ignore`
