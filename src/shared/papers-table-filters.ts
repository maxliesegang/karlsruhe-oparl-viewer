interface FilterControls {
  type: HTMLSelectElement;
  org: HTMLSelectElement;
  role: HTMLSelectElement;
  result: HTMLSelectElement;
  stadtteil: HTMLSelectElement | null;
}

function parseStadtteile(raw: string | undefined): string[] {
  return (raw || "").split("|").filter(Boolean);
}

function getControls(container: HTMLElement): FilterControls | null {
  const type = container.querySelector<HTMLSelectElement>("#filter-type");
  const org = container.querySelector<HTMLSelectElement>("#filter-org");
  const role = container.querySelector<HTMLSelectElement>("#filter-role");
  const result = container.querySelector<HTMLSelectElement>("#filter-result");
  const stadtteil =
    container.querySelector<HTMLSelectElement>("#filter-stadtteil");

  if (!type || !org || !role || !result) return null;
  return { type, org, role, result, stadtteil };
}

function applyFilters(container: HTMLElement, controls: FilterControls): void {
  const typeVal = controls.type.value;
  const orgVal = controls.org.value;
  const roleVal = controls.role.value;
  const resultVal = controls.result.value;
  const stadtteilVal = controls.stadtteil?.value ?? "";

  const filterCount = container.querySelector<HTMLElement>("#filter-count");
  const noResults = container.querySelector<HTMLElement>("#no-results");
  const items = container.querySelectorAll<HTMLElement>(".paper-card");
  const dateHeaders =
    container.querySelectorAll<HTMLElement>(".date-group-header");

  const visibleDates = new Set<string>();
  let visible = 0;

  items.forEach((card) => {
    const matchType = !typeVal || card.dataset.paperType === typeVal;
    const matchOrg = !orgVal || card.dataset.organization === orgVal;
    const matchRole = !roleVal || card.dataset.role === roleVal;
    const matchResult = !resultVal || card.dataset.result === resultVal;
    const stadtteile = parseStadtteile(card.dataset.stadtteile);
    const matchStadtteil = !stadtteilVal || stadtteile.includes(stadtteilVal);

    const show =
      matchType && matchOrg && matchRole && matchResult && matchStadtteil;
    const li = card.closest("li") as HTMLElement;
    li.style.display = show ? "" : "none";

    if (show) {
      visible++;
      const dateGroup = li.dataset.dateGroup;
      if (dateGroup) visibleDates.add(dateGroup);
    }
  });

  dateHeaders.forEach((header) => {
    header.style.display = visibleDates.has(header.dataset.date ?? "")
      ? ""
      : "none";
  });

  if (filterCount) {
    const isFiltered =
      typeVal || orgVal || roleVal || resultVal || stadtteilVal;
    filterCount.textContent = isFiltered
      ? `${visible} von ${items.length} Vorlagen`
      : "";
  }

  if (noResults) {
    noResults.style.display = visible === 0 ? "" : "none";
  }
}

function initPapersTable(container: HTMLElement): void {
  const controls = getControls(container);
  if (!controls) return;

  const runFilters = () => applyFilters(container, controls);
  const scheduleRunFilters = () => requestAnimationFrame(runFilters);

  controls.type.addEventListener("change", runFilters);
  controls.org.addEventListener("change", runFilters);
  controls.role.addEventListener("change", runFilters);
  controls.result.addEventListener("change", runFilters);
  controls.stadtteil?.addEventListener("change", runFilters);
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
