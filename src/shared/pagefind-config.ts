/** Shared Pagefind configuration — build-time helpers and client-side selectors. */

export type PagefindSortDirection = "asc" | "desc";
export type PagefindSort = Readonly<Record<string, PagefindSortDirection>>;

export const PAGEFIND_ROOT_SELECTOR = "pagefind-searchbox.pagefind-ui";
export const PAGEFIND_INPUT_SELECTOR =
  "pagefind-searchbox.pagefind-ui input[type='text']";
export const PAGEFIND_NEWEST_FIRST_SORT = { date: "desc" } as const;

export function isPagefindEnabled(skipPagefindValue: unknown): boolean {
  const normalized = String(skipPagefindValue ?? "")
    .trim()
    .toLowerCase();
  return !["1", "true", "yes"].includes(normalized);
}
