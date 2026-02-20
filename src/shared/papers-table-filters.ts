import { PAPER_FILTER_IDS } from "./paper-filter-definitions";
import { initResponsiveFilterPanel } from "./responsive-filters-panel";
import { VORLAGEN_YEAR_QUERY_PARAM } from "./utils";

export const INITIAL_PAPERS_BATCH_SIZE = 500;
const LOAD_AHEAD_ROOT_MARGIN = "1400px 0px";
const TABLE_INIT_DATA_KEY = "filtersInitialized";

interface FilterControls {
  year: HTMLSelectElement;
  type: HTMLSelectElement;
  org: HTMLSelectElement;
  role: HTMLSelectElement;
  result: HTMLSelectElement;
  stadtteil: HTMLSelectElement | null;
}

interface FilterState {
  year: string;
  type: string;
  org: string;
  role: string;
  result: string;
  stadtteil: string;
}

interface PaperRow {
  item: HTMLElement;
  dateGroup: string;
  year: string;
  type: string;
  org: string;
  role: string;
  result: string;
  stadtteile: Set<string>;
}

interface TableContext {
  controls: FilterControls;
  rows: PaperRow[];
  rowsByYear: Map<string, PaperRow[]>;
  dateHeaders: HTMLElement[];
  loadTrigger: HTMLElement | null;
  filterCount: HTMLElement | null;
  noResults: HTMLElement | null;
  previousVisibleRows: Set<PaperRow>;
  visibleMatchLimit: number;
  totalMatchingRows: number;
}

function parseStadtteile(raw: string | undefined): Set<string> {
  return new Set((raw || "").split("|").filter(Boolean));
}

function hasSelectOption(select: HTMLSelectElement, value: string): boolean {
  return Array.from(select.options).some((option) => option.value === value);
}

function applyYearFromUrl(controls: FilterControls): void {
  const url = new URL(window.location.href);
  const selectedYear =
    url.searchParams.get(VORLAGEN_YEAR_QUERY_PARAM)?.trim() ?? "";
  if (selectedYear && hasSelectOption(controls.year, selectedYear)) {
    controls.year.value = selectedYear;
  }
}

function syncYearToUrl(controls: FilterControls): void {
  const url = new URL(window.location.href);
  if (controls.year.value) {
    url.searchParams.set(VORLAGEN_YEAR_QUERY_PARAM, controls.year.value);
  } else {
    url.searchParams.delete(VORLAGEN_YEAR_QUERY_PARAM);
  }
  history.replaceState(history.state, "", url);
}

function getControls(container: HTMLElement): FilterControls | null {
  const year = container.querySelector<HTMLSelectElement>(
    `#${PAPER_FILTER_IDS.year}`,
  );
  const type = container.querySelector<HTMLSelectElement>(
    `#${PAPER_FILTER_IDS.type}`,
  );
  const org = container.querySelector<HTMLSelectElement>(
    `#${PAPER_FILTER_IDS.org}`,
  );
  const role = container.querySelector<HTMLSelectElement>(
    `#${PAPER_FILTER_IDS.role}`,
  );
  const result = container.querySelector<HTMLSelectElement>(
    `#${PAPER_FILTER_IDS.result}`,
  );
  const stadtteil = container.querySelector<HTMLSelectElement>(
    `#${PAPER_FILTER_IDS.stadtteil}`,
  );

  if (!year || !type || !org || !role || !result) return null;
  return { year, type, org, role, result, stadtteil };
}

function getFilterState(controls: FilterControls): FilterState {
  return {
    year: controls.year.value,
    type: controls.type.value,
    org: controls.org.value,
    role: controls.role.value,
    result: controls.result.value,
    stadtteil: controls.stadtteil?.value ?? "",
  };
}

function buildRows(container: HTMLElement): {
  rows: PaperRow[];
  rowsByYear: Map<string, PaperRow[]>;
} {
  const rows: PaperRow[] = [];
  const rowsByYear = new Map<string, PaperRow[]>();
  const cards = container.querySelectorAll<HTMLAnchorElement>(".paper-card");

  cards.forEach((card) => {
    const item = card.closest("li");
    if (!item) return;

    const row: PaperRow = {
      item,
      dateGroup: item.dataset.dateGroup ?? "",
      year: card.dataset.year ?? "",
      type: card.dataset.paperType ?? "",
      org: card.dataset.organization ?? "",
      role: card.dataset.role ?? "",
      result: card.dataset.result ?? "",
      stadtteile: parseStadtteile(card.dataset.stadtteile),
    };

    rows.push(row);

    const yearRows = rowsByYear.get(row.year);
    if (yearRows) {
      yearRows.push(row);
    } else {
      rowsByYear.set(row.year, [row]);
    }
  });

  return { rows, rowsByYear };
}

function matchesNonYearFilters(row: PaperRow, state: FilterState): boolean {
  if (state.type && row.type !== state.type) return false;
  if (state.org && row.org !== state.org) return false;
  if (state.role && row.role !== state.role) return false;
  if (state.result && row.result !== state.result) return false;
  if (state.stadtteil && !row.stadtteile.has(state.stadtteil)) return false;
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

  const isFiltered =
    state.year ||
    state.type ||
    state.org ||
    state.role ||
    state.result ||
    state.stadtteil;

  if (!isFiltered) {
    filterCount.textContent = "";
    return;
  }

  filterCount.textContent = `${matchingCount} von ${totalCount} Vorlagen`;
}

function updateLoadTrigger(context: TableContext): void {
  if (!context.loadTrigger) return;
  context.loadTrigger.hidden =
    context.totalMatchingRows <= context.visibleMatchLimit;
}

function loadNextRows(context: TableContext): void {
  if (context.totalMatchingRows <= context.visibleMatchLimit) return;
  context.visibleMatchLimit += INITIAL_PAPERS_BATCH_SIZE;
  applyFilters(context);
}

function initLoadTriggerObserver(context: TableContext): void {
  if (!context.loadTrigger) return;
  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        loadNextRows(context);
      }
    },
    { rootMargin: LOAD_AHEAD_ROOT_MARGIN },
  );

  observer.observe(context.loadTrigger);
}

function applyFilters(context: TableContext): void {
  const state = getFilterState(context.controls);
  const yearScopedRows = state.year
    ? (context.rowsByYear.get(state.year) ?? [])
    : context.rows;

  const nextVisibleRows = new Set<PaperRow>();
  const visibleDates = new Set<string>();
  let matchingRowCount = 0;

  for (const row of yearScopedRows) {
    if (!matchesNonYearFilters(row, state)) continue;
    matchingRowCount += 1;

    if (matchingRowCount > context.visibleMatchLimit) {
      continue;
    }

    nextVisibleRows.add(row);
    if (row.dateGroup) visibleDates.add(row.dateGroup);
  }

  for (const row of context.previousVisibleRows) {
    if (!nextVisibleRows.has(row)) {
      row.item.style.display = "none";
    }
  }

  for (const row of nextVisibleRows) {
    if (!context.previousVisibleRows.has(row)) {
      row.item.style.display = "";
    }
  }

  context.previousVisibleRows = nextVisibleRows;
  context.totalMatchingRows = matchingRowCount;

  updateDateHeaders(context.dateHeaders, visibleDates);
  updateFilterCount(
    context.filterCount,
    state,
    matchingRowCount,
    context.rows.length,
  );
  updateLoadTrigger(context);

  if (context.noResults) {
    context.noResults.style.display = matchingRowCount === 0 ? "" : "none";
  }
}

function initPapersTable(container: HTMLElement): void {
  if (container.dataset[TABLE_INIT_DATA_KEY] === "true") return;

  const controls = getControls(container);
  if (!controls) return;
  container.dataset[TABLE_INIT_DATA_KEY] = "true";

  const { rows, rowsByYear } = buildRows(container);
  const context: TableContext = {
    controls,
    rows,
    rowsByYear,
    dateHeaders: Array.from(
      container.querySelectorAll<HTMLElement>(".date-group-header"),
    ),
    loadTrigger: container.querySelector<HTMLElement>("[data-load-trigger]"),
    filterCount: container.querySelector<HTMLElement>("#filter-count"),
    noResults: container.querySelector<HTMLElement>("#no-results"),
    previousVisibleRows: new Set(rows),
    visibleMatchLimit: INITIAL_PAPERS_BATCH_SIZE,
    totalMatchingRows: 0,
  };

  const runFilters = () => {
    applyFilters(context);
  };
  const resetAndRunFilters = () => {
    context.visibleMatchLimit = INITIAL_PAPERS_BATCH_SIZE;
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

  const resetControls: HTMLSelectElement[] = [
    controls.type,
    controls.org,
    controls.role,
    controls.result,
    controls.stadtteil,
  ].filter((control): control is HTMLSelectElement => Boolean(control));
  resetControls.forEach((control) =>
    control.addEventListener("change", resetAndRunFilters),
  );

  window.addEventListener("pageshow", scheduleRunFilters);

  // Keep list state in sync when browser restores select values.
  scheduleRunFilters();
}

export function initPapersTableFilters(): void {
  const containers = document.querySelectorAll<HTMLElement>(
    "[data-papers-table]",
  );
  containers.forEach((container) => initPapersTable(container));
}
