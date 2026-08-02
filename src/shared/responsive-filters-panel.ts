interface FilterPanelContext {
  panel: HTMLElement;
  row: HTMLElement;
  toggle: HTMLButtonElement;
  isCollapsible: boolean;
  isExpanded: boolean;
  alwaysCollapsible: boolean;
  expandedLabel: string;
  collapsedLabel: string;
}

export interface ResponsiveFilterPanelOptions {
  initiallyExpanded?: boolean;
  alwaysCollapsible?: boolean;
  expandedLabel?: string;
  collapsedLabel?: string;
}

function getFilterPanel(
  container: HTMLElement,
  options: ResponsiveFilterPanelOptions,
): FilterPanelContext | null {
  const panel = container.matches("[data-filters-panel]")
    ? container
    : container.querySelector<HTMLElement>("[data-filters-panel]");
  const row = panel?.querySelector<HTMLElement>("[data-filter-row]");
  const toggle = panel?.querySelector<HTMLButtonElement>(
    "[data-filters-toggle]",
  );

  if (!panel || !row || !toggle) return null;

  return {
    panel,
    row,
    toggle,
    isCollapsible: options.alwaysCollapsible ?? false,
    isExpanded: options.initiallyExpanded ?? true,
    alwaysCollapsible: options.alwaysCollapsible ?? false,
    expandedLabel: options.expandedLabel ?? "Filter ausblenden",
    collapsedLabel: options.collapsedLabel ?? "Filter anzeigen",
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
    ? panel.expandedLabel
    : panel.collapsedLabel;
}

function refreshFilterPanel(panel: FilterPanelContext): void {
  if (panel.alwaysCollapsible) {
    panel.isCollapsible = true;
    renderFilterPanel(panel);
    return;
  }

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

export function initResponsiveFilterPanel(
  container: HTMLElement,
  options: ResponsiveFilterPanelOptions = {},
): void {
  const panel = getFilterPanel(container, options);
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
