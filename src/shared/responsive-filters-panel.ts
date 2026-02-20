interface FilterPanelContext {
  panel: HTMLElement;
  row: HTMLElement;
  toggle: HTMLButtonElement;
  isCollapsible: boolean;
  isExpanded: boolean;
}

function getFilterPanel(container: HTMLElement): FilterPanelContext | null {
  const panel = container.querySelector<HTMLElement>("[data-filters-panel]");
  const row = panel?.querySelector<HTMLElement>("[data-filter-row]");
  const toggle = panel?.querySelector<HTMLButtonElement>(
    "[data-filters-toggle]",
  );

  if (!panel || !row || !toggle) return null;

  return {
    panel,
    row,
    toggle,
    isCollapsible: false,
    isExpanded: true,
  };
}

function countFilterRows(row: HTMLElement): number {
  const groups = Array.from(row.querySelectorAll<HTMLElement>(".filter-group"));
  if (groups.length === 0) return 0;

  let rows = 1;
  let previousOffsetLeft = groups[0].offsetLeft;

  for (let i = 1; i < groups.length; i += 1) {
    const currentOffsetLeft = groups[i].offsetLeft;
    if (currentOffsetLeft <= previousOffsetLeft) {
      rows += 1;
    }
    previousOffsetLeft = currentOffsetLeft;
  }

  return rows;
}

function renderFilterPanel(panel: FilterPanelContext): void {
  panel.panel.dataset.collapsible = panel.isCollapsible ? "true" : "false";
  panel.panel.dataset.expanded = panel.isExpanded ? "true" : "false";
  panel.toggle.disabled = !panel.isCollapsible;
  panel.toggle.setAttribute(
    "aria-expanded",
    panel.isExpanded ? "true" : "false",
  );
  panel.toggle.textContent = panel.isExpanded
    ? "Filter ausblenden"
    : "Filter anzeigen";
}

function refreshFilterPanel(panel: FilterPanelContext): void {
  const shouldCollapse = countFilterRows(panel.row) > 1;

  if (!shouldCollapse) {
    panel.isCollapsible = false;
    panel.isExpanded = true;
    renderFilterPanel(panel);
    return;
  }

  if (!panel.isCollapsible) {
    panel.isExpanded = false;
  }

  panel.isCollapsible = true;
  renderFilterPanel(panel);
}

export function initResponsiveFilterPanel(container: HTMLElement): void {
  const panel = getFilterPanel(container);
  if (!panel) return;

  const refreshPanel = () => refreshFilterPanel(panel);
  const scheduleRefreshPanel = () => requestAnimationFrame(refreshPanel);

  panel.toggle.addEventListener("click", () => {
    if (!panel.isCollapsible) return;
    panel.isExpanded = !panel.isExpanded;
    renderFilterPanel(panel);
  });

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(scheduleRefreshPanel);
    observer.observe(panel.panel);
    observer.observe(panel.row);
  } else {
    window.addEventListener("resize", scheduleRefreshPanel);
  }

  window.addEventListener("pageshow", scheduleRefreshPanel);
  scheduleRefreshPanel();
}
