import { SEARCH_INPUT_SELECTOR } from "./pagefind-config";
import {
  getBrowserStorage,
  isSameSavedSearchQuery,
  normalizeSavedSearchQuery,
  readSavedSearches,
  SAVED_SEARCH_QUERY_PARAM,
  type SavedSearch,
  upsertSavedSearch,
  writeSavedSearches,
} from "./saved-searches";

const STATUS_AUTO_DISMISS_MS = 4_000;
const BOOKMARK_SVG = `<svg class="saved-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2z"/></svg>`;

function getUrlQuery(): string {
  const params = new URLSearchParams(window.location.search);
  return normalizeSavedSearchQuery(params.get(SAVED_SEARCH_QUERY_PARAM) ?? "");
}

function isQuerySaved(searches: SavedSearch[], query: string): boolean {
  return searches.some((search) => isSameSavedSearchQuery(search.query, query));
}

export function initIndexSavedSearchControl(): void {
  const root = document.querySelector<HTMLElement>(
    "[data-saved-search-controls]",
  );
  if (!root) return;

  const saveButton = root.querySelector<HTMLButtonElement>(
    "[data-save-search-button]",
  );
  const saveStatus = root.querySelector<HTMLElement>(
    "[data-save-search-status]",
  );
  const savedSearchesLink = root.querySelector<HTMLAnchorElement>(
    "[data-saved-searches-link]",
  );
  if (!saveButton || !saveStatus) return;

  const storage = getBrowserStorage();
  if (!storage) {
    saveButton.disabled = true;
    saveStatus.textContent = "Speichern ist in diesem Browser nicht verfügbar.";
    saveStatus.dataset.state = "error";
    return;
  }

  let searches = readSavedSearches(storage);
  const inputElement = document.querySelector<HTMLInputElement>(
    SEARCH_INPUT_SELECTOR,
  );
  let statusDismissTimer: ReturnType<typeof setTimeout> | undefined;

  const handleInputUpdate = (): void => {
    clearStatus();
    syncButtonState();
  };

  const setStatus = (state: "info" | "error", text: string): void => {
    clearTimeout(statusDismissTimer);
    saveStatus.dataset.state = state;
    saveStatus.textContent = text;

    if (state === "info") {
      statusDismissTimer = setTimeout(clearStatus, STATUS_AUTO_DISMISS_MS);
    }
  };

  const clearStatus = (): void => {
    clearTimeout(statusDismissTimer);
    saveStatus.dataset.state = "";
    saveStatus.textContent = "";
  };

  const syncLinkBadge = (): void => {
    if (!savedSearchesLink) return;
    const count = searches.length;
    savedSearchesLink.textContent =
      count > 0 ? `Gespeicherte Suchen (${count})` : "Gespeicherte Suchen";
  };

  const syncButtonState = (queryOverride?: string): void => {
    const query =
      queryOverride ?? normalizeSavedSearchQuery(inputElement?.value ?? "");
    if (!query) {
      saveButton.disabled = true;
      saveButton.innerHTML = `${BOOKMARK_SVG} Suche speichern`;
      return;
    }

    const savedAlready = isQuerySaved(searches, query);
    saveButton.disabled = false;
    saveButton.innerHTML = savedAlready
      ? `${BOOKMARK_SVG} Suche aktualisieren`
      : `${BOOKMARK_SVG} Suche speichern`;
  };

  inputElement?.addEventListener("input", handleInputUpdate);
  // The panel may fill the input from `?q=` before or after this runs, so the
  // initial state falls back to the URL query.
  syncButtonState(
    normalizeSavedSearchQuery(inputElement?.value ?? "") || getUrlQuery(),
  );
  syncLinkBadge();

  saveButton.addEventListener("click", () => {
    const query = normalizeSavedSearchQuery(inputElement?.value ?? "");
    if (!query) {
      syncButtonState();
      return;
    }

    searches = readSavedSearches(storage);
    const wasSavedAlready = isQuerySaved(searches, query);
    const updated = upsertSavedSearch(searches, query);
    const saved = writeSavedSearches(storage, updated);

    if (!saved) {
      setStatus("error", "Suche konnte nicht gespeichert werden.");
      return;
    }

    searches = updated;
    setStatus(
      "info",
      wasSavedAlready
        ? `Suche aktualisiert: "${query}"`
        : `Suche gespeichert: "${query}"`,
    );
    syncLinkBadge();
    syncButtonState();
  });
}
