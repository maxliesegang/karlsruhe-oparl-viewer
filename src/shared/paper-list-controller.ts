import {
  PAPER_FILTER_FIELDS,
  type PaperFilterKey,
} from "./paper-filter-definitions";
import { initResponsiveFilterPanel } from "./responsive-filters-panel";
import { PAPERS_YEAR_QUERY_PARAMETER } from "./utils";

export const INITIAL_PAPER_BATCH_SIZE = 500;
const LOAD_AHEAD_ROOT_MARGIN = "1400px 0px";
const LIST_INIT_DATA_KEY = "filtersInitialized";

type FilterControls = Record<PaperFilterKey, HTMLSelectElement>;
type FilterState = Record<PaperFilterKey, string>;
type PaperListFilterValues = Record<PaperFilterKey, string | Set<string>>;

interface PaperListItem {
  element: HTMLElement;
  dateGroup: string;
  filters: PaperListFilterValues;
}

interface PaperListContext {
  controls: FilterControls;
  items: PaperListItem[];
  itemsByYear: Map<string, PaperListItem[]>;
  dateHeaders: HTMLElement[];
  loadTrigger: HTMLElement | null;
  filterCount: HTMLElement | null;
  noResults: HTMLElement | null;
  previouslyVisibleItems: Set<PaperListItem>;
  visibleMatchLimit: number;
  totalMatchingItems: number;
}

function parseDelimitedValues(raw: string): Set<string> {
  return new Set((raw || "").split("|").filter(Boolean));
}

function hasSelectOption(select: HTMLSelectElement, value: string): boolean {
  return Array.from(select.options).some((option) => option.value === value);
}

function applyYearFromUrl(controls: FilterControls): void {
  const url = new URL(window.location.href);
  const selectedYear =
    url.searchParams.get(PAPERS_YEAR_QUERY_PARAMETER)?.trim() ?? "";
  if (selectedYear && hasSelectOption(controls.year, selectedYear)) {
    controls.year.value = selectedYear;
  }
}

function syncYearToUrl(controls: FilterControls): void {
  const url = new URL(window.location.href);
  if (controls.year.value) {
    url.searchParams.set(PAPERS_YEAR_QUERY_PARAMETER, controls.year.value);
  } else {
    url.searchParams.delete(PAPERS_YEAR_QUERY_PARAMETER);
  }
  history.replaceState(history.state, "", url);
}

function collectFilterControls(container: HTMLElement): FilterControls | null {
  const controls = {} as Partial<FilterControls>;
  for (const field of PAPER_FILTER_FIELDS) {
    const control = container.querySelector<HTMLSelectElement>(`#${field.id}`);
    if (!control) return null;
    controls[field.key] = control;
  }
  return controls as FilterControls;
}

function readFilterState(controls: FilterControls): FilterState {
  return Object.fromEntries(
    PAPER_FILTER_FIELDS.map(({ key }) => [key, controls[key].value]),
  ) as FilterState;
}

function collectPaperListItems(container: HTMLElement): {
  items: PaperListItem[];
  itemsByYear: Map<string, PaperListItem[]>;
} {
  const items: PaperListItem[] = [];
  const itemsByYear = new Map<string, PaperListItem[]>();
  const cards = container.querySelectorAll<HTMLAnchorElement>(".paper-card");

  cards.forEach((card) => {
    const item = card.closest("li");
    if (!item) return;

    const filters = Object.fromEntries(
      PAPER_FILTER_FIELDS.map((field) => {
        const value = card.getAttribute(`data-${field.dataAttribute}`) ?? "";
        return [
          field.key,
          field.multipleValues ? parseDelimitedValues(value) : value,
        ];
      }),
    ) as PaperListFilterValues;
    const paperListItem: PaperListItem = {
      element: item,
      dateGroup: item.dataset.dateGroup ?? "",
      filters,
    };

    items.push(paperListItem);

    const year = filters.year as string;
    const yearItems = itemsByYear.get(year);
    if (yearItems) {
      yearItems.push(paperListItem);
    } else {
      itemsByYear.set(year, [paperListItem]);
    }
  });

  return { items, itemsByYear };
}

function matchesNonYearFilters(
  item: PaperListItem,
  state: FilterState,
): boolean {
  for (const field of PAPER_FILTER_FIELDS) {
    if (field.key === "year") continue;
    const selectedValue = state[field.key];
    if (!selectedValue) continue;

    const rowValue = item.filters[field.key];
    const matches =
      rowValue instanceof Set
        ? rowValue.has(selectedValue)
        : rowValue === selectedValue;
    if (!matches) return false;
  }
  return true;
}

function updateDateHeaders(
  dateHeaders: HTMLElement[],
  visibleDates: Set<string>,
): void {
  dateHeaders.forEach((header) => {
    header.style.display = visibleDates.has(header.dataset.date ?? "")
      ? ""
      : "none";
  });
}

function updateFilterCount(
  filterCount: HTMLElement | null,
  state: FilterState,
  matchingCount: number,
  totalCount: number,
): void {
  if (!filterCount) return;

  const isFiltered = PAPER_FILTER_FIELDS.some(({ key }) => state[key]);

  if (!isFiltered) {
    filterCount.textContent = "";
    return;
  }

  filterCount.textContent = `${matchingCount} von ${totalCount} Vorlagen`;
}

function updateLoadTrigger(context: PaperListContext): void {
  if (!context.loadTrigger) return;
  context.loadTrigger.hidden =
    context.totalMatchingItems <= context.visibleMatchLimit;
}

function loadNextItems(context: PaperListContext): void {
  if (context.totalMatchingItems <= context.visibleMatchLimit) return;
  context.visibleMatchLimit += INITIAL_PAPER_BATCH_SIZE;
  applyFilters(context);
}

function initLoadTriggerObserver(context: PaperListContext): void {
  if (!context.loadTrigger) return;
  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        loadNextItems(context);
      }
    },
    { rootMargin: LOAD_AHEAD_ROOT_MARGIN },
  );

  observer.observe(context.loadTrigger);
}

function applyFilters(context: PaperListContext): void {
  const state = readFilterState(context.controls);
  const yearScopedItems = state.year
    ? (context.itemsByYear.get(state.year) ?? [])
    : context.items;

  const nextVisibleItems = new Set<PaperListItem>();
  const visibleDates = new Set<string>();
  let matchingItemCount = 0;

  for (const item of yearScopedItems) {
    if (!matchesNonYearFilters(item, state)) continue;
    matchingItemCount += 1;

    if (matchingItemCount > context.visibleMatchLimit) {
      continue;
    }

    nextVisibleItems.add(item);
    if (item.dateGroup) visibleDates.add(item.dateGroup);
  }

  for (const item of context.previouslyVisibleItems) {
    if (!nextVisibleItems.has(item)) {
      item.element.style.display = "none";
    }
  }

  for (const item of nextVisibleItems) {
    if (!context.previouslyVisibleItems.has(item)) {
      item.element.style.display = "";
    }
  }

  context.previouslyVisibleItems = nextVisibleItems;
  context.totalMatchingItems = matchingItemCount;

  updateDateHeaders(context.dateHeaders, visibleDates);
  updateFilterCount(
    context.filterCount,
    state,
    matchingItemCount,
    context.items.length,
  );
  updateLoadTrigger(context);

  if (context.noResults) {
    context.noResults.style.display = matchingItemCount === 0 ? "" : "none";
  }
}

function initPaperListElement(container: HTMLElement): void {
  if (container.dataset[LIST_INIT_DATA_KEY] === "true") return;

  const controls = collectFilterControls(container);
  if (!controls) return;
  container.dataset[LIST_INIT_DATA_KEY] = "true";

  const { items, itemsByYear } = collectPaperListItems(container);
  const context: PaperListContext = {
    controls,
    items,
    itemsByYear,
    dateHeaders: Array.from(
      container.querySelectorAll<HTMLElement>(".date-group-header"),
    ),
    loadTrigger: container.querySelector<HTMLElement>("[data-load-trigger]"),
    filterCount: container.querySelector<HTMLElement>("#filter-count"),
    noResults: container.querySelector<HTMLElement>("#no-results"),
    previouslyVisibleItems: new Set(items),
    visibleMatchLimit: INITIAL_PAPER_BATCH_SIZE,
    totalMatchingItems: 0,
  };

  const runFilters = () => {
    applyFilters(context);
  };
  const resetAndRunFilters = () => {
    context.visibleMatchLimit = INITIAL_PAPER_BATCH_SIZE;
    runFilters();
  };
  const scheduleRunFilters = () => requestAnimationFrame(runFilters);
  const runFiltersAndSyncYearUrl = () => {
    resetAndRunFilters();
    syncYearToUrl(controls);
  };

  initResponsiveFilterPanel(container);
  applyYearFromUrl(controls);
  initLoadTriggerObserver(context);

  controls.year.addEventListener("change", runFiltersAndSyncYearUrl);

  for (const field of PAPER_FILTER_FIELDS) {
    if (field.key !== "year") {
      controls[field.key].addEventListener("change", resetAndRunFilters);
    }
  }

  window.addEventListener("pageshow", scheduleRunFilters);

  // Keep list state in sync when browser restores select values.
  scheduleRunFilters();
}

export function initPaperList(): void {
  const containers =
    document.querySelectorAll<HTMLElement>("[data-paper-list]");
  containers.forEach((container) => initPaperListElement(container));
}
