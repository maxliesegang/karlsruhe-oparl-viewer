import {
  PAGEFIND_INPUT_SELECTOR,
  PAGEFIND_ROOT_SELECTOR,
} from "./pagefind-config";
import {
  normalizeSavedSearchQuery,
  SAVED_SEARCH_QUERY_PARAM,
} from "./saved-searches";

function getQueryFromUrl(paramName: string): string {
  const url = new URL(window.location.href);
  return normalizeSavedSearchQuery(url.searchParams.get(paramName) ?? "");
}

function applyQueryToInput(input: HTMLInputElement, query: string): void {
  input.value = query;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

export function initPagefindQueryFromUrl(
  queryParamName: string = SAVED_SEARCH_QUERY_PARAM,
): void {
  const query = getQueryFromUrl(queryParamName);
  if (!query) return;

  const tryApply = (): boolean => {
    const input = document.querySelector<HTMLInputElement>(
      PAGEFIND_INPUT_SELECTOR,
    );
    if (!input) return false;
    applyQueryToInput(input, query);
    return true;
  };

  if (tryApply()) return;

  const root = document.querySelector<HTMLElement>(PAGEFIND_ROOT_SELECTOR);
  if (!root) return;

  const observer = new MutationObserver(() => {
    if (tryApply()) observer.disconnect();
  });

  observer.observe(root, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 10_000);
}
