# Agent Guide — `src/components/`

Reusable UI components. Prefer extending existing components over creating new ones.

## Component Catalog

| Component                    | Role                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| `SiteNavigation.astro`       | Top nav — desktop/mobile + overlay                                |
| `SiteFooter.astro`           | Site context and external data/source links                       |
| `Breadcrumbs.astro`          | Canonical hierarchy on detail and scoped list pages               |
| `PageContainer.astro`        | Shared max-width wrapper (`width="wide" \| "narrow"`)             |
| `PaperListPage.astro`        | Reusable list-page skeleton (title + intro slot + list)           |
| `PaperList.astro`            | Paper cards, summary text, filter panel mount point               |
| `PaperFilters.astro`         | Filter controls panel                                             |
| `FilterSelect.astro`         | Reusable dropdown for a single filter                             |
| `MeetingFilters.astro`       | Meeting-specific filter controls and status                       |
| `MeetingActions.astro`       | Single-event calendar download and committee feed links           |
| `SearchPanel.astro`          | Pagefind search box + rich result cards (custom UI)               |
| `FeedSubscriptionLink.astro` | Shared link to an external update feed                            |
| `LegacyRedirectPage.astro`   | Noindex redirect shell for legacy routes                          |
| `PaperHeader.astro`          | Detail-page title block: reference, type, date, title, status bar |
| `PaperFacts.astro`           | "Eckdaten" sidebar card — modified, bodies, submitters, districts |
| `PaperSummary.astro`         | LLM summary + key points, one per full-width row; only if present |
| `AuxiliaryFiles.astro`       | File attachments — detail page                                    |
| `StadtteilHint.astro`        | District hint — detail page                                       |
| `MeetingAgenda.astro`        | Public agenda with links to matching papers                       |
| `PaperTimeline.astro`        | Paper lifecycle, consultations, and decisions                     |
| `RelatedPapers.astro`        | Parent, amendment, and follow-up paper links                      |

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
- Search weights reflect the source's signal: summary prose and key points `2`,
  attachment names `1.5`, extracted PDF text `0.75`. The title already gets
  Pagefind's default heading and title-meta boosts. PDF-only terms stay searchable.
- Search results are rendered by `SearchPanel.astro` +
  `search-panel-controller.ts` against the Pagefind JS API — the
  `astro-pagefind` integration was replaced by `integrations/pagefind-lean.mjs`,
  and its `<Search>` component is intentionally not used
- Result cards read these `data-pagefind-meta` names:
  `PaperHeader` sets `paper-type` · `paper-date`;
  `PaperFacts` sets `paper-reference` · `paper-organizations` ·
  `paper-submitters` · `paper-districts` · `paper-modified` · `paper-created`
- Where the detail page displays the value, the meta rides on that element so it
  is never shown twice. Where it does not, it uses the literal `name:value` form
  on an empty span, which registers the value without adding page text or search
  excerpts — `paper-created`, plus both of `PaperHeader`'s, which have no visible
  home since the header shows only the title and status bar
- Pagefind searches metadata fields too, but metadata-only matches may lack a
  useful page-text excerpt. Keep fields readers search by in visible page text
  where practical — the "Eckdaten" card carries the reference number instead
  of leaving it only in the (Pagefind-ignored) breadcrumb
- Panel markup contract (selectors in `pagefind-config.ts`):
  `data-search-panel` (with `data-base-url` + `data-sort-mode`) ·
  `data-search-form` · `data-search-input` · `data-search-clear` ·
  `data-search-status` · `data-search-results` · `data-search-empty` ·
  `data-search-load-trigger`

**Extracted file text — indexed at build, fetched at runtime**

`AuxiliaryFiles.astro` renders each attachment's full extracted PDF text. That
text is ~61% of all paper HTML (~276 MB), so the `pagefind-lean` integration
(`integrations/pagefind-lean.mjs`) indexes every page **as rendered** and only
then empties the container in the written file. `file-text-loader.ts` re-fetches
it from the syndication mirror when a reader opens the disclosure.

Indexing before stripping preserves search coverage; the weights above affect
ranking and excerpt choice. Do not reorder those two steps, and keep this markup:

```
<details data-file-text-details>        ← wrapper the loader binds to
  <p class="file-text" data-file-text data-file-id="10003" data-pagefind-weight="0.75">…</p>
</details>
```

- `data-file-text` is the strip marker; the integration matches the bare flag,
  so never rename it to a prefix like `data-file-text-…` on that element
- `data-file-id` is the mirror's file id — omitted when no text exists, which is
  what keeps the "Kein Text verfügbar" placeholder out of the lazy path
- An **empty** container is the signal that stripping ran. `astro dev` does not
  strip, so the text stays inlined there and nothing is fetched

**Internal links**

- Every internal `href` must be prefixed with `import.meta.env.BASE_URL` to work on GitHub Pages
- Build route URLs with the `build*Url` helpers in `utils.ts` rather than
  interpolating a path — they own the slugging and encoding each route expects
  (`buildDistrictUrl` slugifies, `buildFactionUrl` percent-encodes,
  `buildMeetingUrl` returns `undefined` for an unusable id so callers render the
  name unlinked instead of linking to a bare `/sitzungen/`)
- `PaperFacts` links each submitter and district to its own list page. Factions
  hidden by `HIDDEN_SUBMITTER_IDS` in `data.ts` have no page, so
  `resolvePaperSubmitters` omits their `factionId` and the name renders
  unlinked — do not link on name alone

**Sticky offsets**

The site header is `position: sticky`. Anything that sticks or is scrolled to
below it must clear `--site-header-height` (defined in `Layout.astro`, consumed
by `SiteNavigation.astro`) — see `.detail-side` and the `#paper-files`
deep-link target.

## Adding New Components

- Keep text and labels in German unless a broader i18n change is requested
- If the component appears on list pages, check whether it needs `data-pagefind-ignore`
