import {
  loadPagefindModule,
  type PagefindModule,
  type PagefindResultData,
  type PagefindSearchResult,
} from "./pagefind-client";
import {
  PAGEFIND_MODIFIED_FIRST_SORT,
  SEARCH_INPUT_SELECTOR,
  SEARCH_PANEL_SELECTOR,
} from "./pagefind-config";
import {
  normalizeSavedSearchQuery,
  SAVED_SEARCH_QUERY_PARAM,
} from "./saved-searches";
import { formatDateShort } from "./utils";

/** Result sorting per page: relevance for the main search, recency for feeds. */
export type SearchSortMode = "relevance" | "modified";

export const SEARCH_RESULT_BATCH_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 160;
const MIN_QUERY_LENGTH = 2;
const LOAD_AHEAD_ROOT_MARGIN = "600px";
/** Words of context per excerpt — the default (30) leaves cards looking thin. */
const EXCERPT_LENGTH = 45;

const META_EMPTY_VALUES = new Set(["", "Keine Angaben", "-"]);

interface SearchPanelElements {
  root: HTMLElement;
  input: HTMLInputElement;
  clearButton: HTMLButtonElement | null;
  status: HTMLElement;
  list: HTMLElement;
  loadTrigger: HTMLElement;
  empty: HTMLElement;
}

interface SearchPanelContext extends SearchPanelElements {
  baseUrl: string;
  sortMode: SearchSortMode;
  results: PagefindSearchResult[];
  renderedCount: number;
  query: string;
  searchToken: number;
}

function getSortLabel(sortMode: SearchSortMode): string {
  return sortMode === "modified"
    ? "sortiert nach letzter Änderung"
    : "sortiert nach Relevanz";
}

function getMeaningfulValue(value: string | undefined): string | undefined {
  const normalized = value?.trim() ?? "";
  return META_EMPTY_VALUES.has(normalized) ? undefined : normalized;
}

function createElement(
  tagName: string,
  className: string,
  text?: string,
): HTMLElement {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function buildMetaChips(meta: Record<string, string | undefined>): string[] {
  const reference = getMeaningfulValue(meta["paper-reference"]);
  const paperType = getMeaningfulValue(meta["paper-type"]);
  const date = formatDateShort(getMeaningfulValue(meta["paper-date"]));
  const organizations = getMeaningfulValue(meta["paper-organizations"]);

  return [reference, paperType, date || undefined, organizations].filter(
    (value): value is string => Boolean(value),
  );
}

function buildResultCard(
  data: PagefindResultData,
  sortMode: SearchSortMode,
): HTMLLIElement {
  const meta = data.meta ?? {};
  const item = document.createElement("li");
  item.className = "search-result";

  const link = document.createElement("a");
  link.className = "search-result-link";
  link.href = data.url ?? "#";

  link.append(
    createElement(
      "span",
      "search-result-title",
      getMeaningfulValue(meta.title) ?? "Ohne Titel",
    ),
  );

  const chips = buildMetaChips(meta);
  if (chips.length > 0) {
    const metaLine = createElement("span", "search-result-meta");
    for (const chip of chips) {
      metaLine.append(createElement("span", "search-result-chip", chip));
    }
    link.append(metaLine);
  }

  if (data.excerpt) {
    const excerpt = createElement("span", "search-result-excerpt");
    // Pagefind escapes indexed content and only adds <mark> highlights itself.
    excerpt.innerHTML = data.excerpt;
    link.append(excerpt);
  }

  const districts = getMeaningfulValue(meta["paper-districts"]);
  const modified = formatDateShort(getMeaningfulValue(meta["paper-modified"]));
  const footerParts = [
    districts ? `Stadtteile: ${districts}` : undefined,
    modified ? `Aktualisiert am ${modified}` : undefined,
  ].filter(Boolean);

  if (footerParts.length > 0) {
    const footer = createElement(
      "span",
      "search-result-footer",
      footerParts.join(" · "),
    );
    if (sortMode === "modified" && modified) {
      footer.dataset.emphasis = "modified";
    }
    link.append(footer);
  }

  item.append(link);
  return item;
}

function setStatus(context: SearchPanelContext, text: string): void {
  context.status.textContent = text;
}

function resetResults(context: SearchPanelContext): void {
  context.results = [];
  context.renderedCount = 0;
  context.list.replaceChildren();
  context.loadTrigger.hidden = true;
  context.empty.hidden = true;
}

async function renderNextBatch(context: SearchPanelContext): Promise<void> {
  const token = context.searchToken;
  const batch = context.results.slice(
    context.renderedCount,
    context.renderedCount + SEARCH_RESULT_BATCH_SIZE,
  );
  if (batch.length === 0) {
    context.loadTrigger.hidden = true;
    return;
  }

  context.renderedCount += batch.length;
  const dataEntries = await Promise.all(
    batch.map((result) => result.data?.().catch(() => undefined)),
  );
  if (token !== context.searchToken) return;

  const cards = dataEntries
    .filter((data): data is PagefindResultData => Boolean(data))
    .map((data) => buildResultCard(data, context.sortMode));

  context.list.append(...cards);
  context.loadTrigger.hidden = context.renderedCount >= context.results.length;
}

function initLoadTriggerObserver(context: SearchPanelContext): void {
  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (context.loadTrigger.hidden) continue;
        void renderNextBatch(context);
      }
    },
    { rootMargin: LOAD_AHEAD_ROOT_MARGIN },
  );

  observer.observe(context.loadTrigger);
}

function buildSearchOptions(sortMode: SearchSortMode) {
  return sortMode === "modified"
    ? { sort: { ...PAGEFIND_MODIFIED_FIRST_SORT } }
    : {};
}

async function runSearch(
  context: SearchPanelContext,
  pagefindPromise: Promise<PagefindModule>,
): Promise<void> {
  const query = normalizeSavedSearchQuery(context.input.value);
  if (query === context.query) return;

  context.query = query;
  const token = ++context.searchToken;

  if (context.clearButton) context.clearButton.hidden = query.length === 0;

  if (query.length < MIN_QUERY_LENGTH) {
    resetResults(context);
    setStatus(
      context,
      query.length === 0 ? "" : "Bitte mindestens zwei Zeichen eingeben.",
    );
    return;
  }

  setStatus(context, "Suche läuft …");

  try {
    const pagefind = await pagefindPromise;
    const response = await pagefind.search(
      query,
      buildSearchOptions(context.sortMode),
    );
    if (token !== context.searchToken) return;

    resetResults(context);
    context.results = response.results ?? [];

    if (context.results.length === 0) {
      setStatus(context, `Keine Treffer für „${query}“.`);
      context.empty.hidden = false;
      return;
    }

    const countLabel =
      context.results.length === 1
        ? "1 Treffer"
        : `${context.results.length} Treffer`;
    setStatus(
      context,
      `${countLabel} für „${query}“ · ${getSortLabel(context.sortMode)}`,
    );
    await renderNextBatch(context);
  } catch (error) {
    if (token !== context.searchToken) return;
    console.warn("Pagefind search failed.", error);
    resetResults(context);
    setStatus(context, "Die Suche ist momentan nicht verfügbar.");
  }
}

function getQueryFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return normalizeSavedSearchQuery(params.get(SAVED_SEARCH_QUERY_PARAM) ?? "");
}

function resolveElements(root: HTMLElement): SearchPanelElements | null {
  const input = root.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR);
  const status = root.querySelector<HTMLElement>("[data-search-status]");
  const list = root.querySelector<HTMLElement>("[data-search-results]");
  const loadTrigger = root.querySelector<HTMLElement>(
    "[data-search-load-trigger]",
  );
  const empty = root.querySelector<HTMLElement>("[data-search-empty]");
  if (!input || !status || !list || !loadTrigger || !empty) return null;

  return {
    root,
    input,
    clearButton: root.querySelector<HTMLButtonElement>("[data-search-clear]"),
    status,
    list,
    loadTrigger,
    empty,
  };
}

export function initSearchPanel(): void {
  const root = document.querySelector<HTMLElement>(SEARCH_PANEL_SELECTOR);
  if (!root) return;

  const elements = resolveElements(root);
  if (!elements) return;

  const context: SearchPanelContext = {
    ...elements,
    baseUrl: root.dataset.baseUrl ?? "/",
    sortMode: root.dataset.sortMode === "modified" ? "modified" : "relevance",
    results: [],
    renderedCount: 0,
    query: "",
    searchToken: 0,
  };

  const pagefindPromise = loadPagefindModule(context.baseUrl).then(
    async (pagefind) => {
      await pagefind.options?.({ excerptLength: EXCERPT_LENGTH });
      return pagefind;
    },
  );

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleSearch = (): void => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(
      () => void runSearch(context, pagefindPromise),
      SEARCH_DEBOUNCE_MS,
    );
  };

  context.input.addEventListener("input", scheduleSearch);
  context.root
    .querySelector("[data-search-form]")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      clearTimeout(debounceTimer);
      void runSearch(context, pagefindPromise);
    });

  context.clearButton?.addEventListener("click", () => {
    context.input.value = "";
    context.input.dispatchEvent(new Event("input", { bubbles: true }));
    context.input.focus();
  });

  initLoadTriggerObserver(context);

  const initialQuery = getQueryFromUrl();
  if (initialQuery) {
    context.input.value = initialQuery;
    context.input.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
