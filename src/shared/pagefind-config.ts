/** Shared Pagefind configuration — build-time helpers and client-side selectors. */

export type PagefindSortDirection = "asc" | "desc";
export type PagefindSort = Readonly<Record<string, PagefindSortDirection>>;

/** Search panel markup contract — see `src/components/SearchPanel.astro`. */
export const SEARCH_PANEL_SELECTOR = "[data-search-panel]";
export const SEARCH_INPUT_SELECTOR = "[data-search-input]";

/** Saved searches behave as a "what changed since I last looked" feed. */
export const PAGEFIND_MODIFIED_FIRST_SORT = { modified: "desc" } as const;

export function isPagefindEnabled(skipPagefindValue: unknown): boolean {
  const normalized = String(skipPagefindValue ?? "")
    .trim()
    .toLowerCase();
  return !["1", "true", "yes"].includes(normalized);
}
