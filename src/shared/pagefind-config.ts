/** Shared Pagefind configuration — build-time helpers and client-side selectors. */

export const PAGEFIND_ROOT_SELECTOR = "[data-pagefind-ui]";
export const PAGEFIND_INPUT_SELECTOR = "[data-pagefind-ui] input[type='text']";

export function isPagefindEnabled(skipPagefindValue: unknown): boolean {
  const normalized = String(skipPagefindValue ?? "")
    .trim()
    .toLowerCase();
  return !["1", "true", "yes"].includes(normalized);
}

export const pagefindUiOptions = {
  showImages: false,
  pageSize: 10,
  sort: { date: "dsc" },
  translations: {
    placeholder: "Suchen",
    clear_search: "Löschen",
    load_more: "Mehr Ergebnisse laden",
    search_label: "Diese Seite durchsuchen",
    filters_label: "Filter",
    zero_results: "Keine Ergebnisse für [SEARCH_TERM]",
    many_results: "[COUNT] Ergebnisse für [SEARCH_TERM]",
    one_result: "[COUNT] Ergebnis für [SEARCH_TERM]",
    alt_search:
      "Keine Ergebnisse für [SEARCH_TERM]. Stattdessen werden Ergebnisse für [DIFFERENT_TERM] angezeigt",
    search_suggestion:
      "Keine Ergebnisse für [SEARCH_TERM]. Versuchen Sie eine der folgenden Suchen:",
    searching: "Suche nach [SEARCH_TERM]...",
  },
} as const;
