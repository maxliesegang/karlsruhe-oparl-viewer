export const SAVED_SEARCHES_STORAGE_KEY = "gemeinderatsradar.saved-searches";
export const SAVED_SEARCH_QUERY_PARAM = "q";
export const SAVED_SEARCH_RESULTS_PATH = "suche";
export const MAX_SAVED_SEARCHES = 25;

export interface SavedSearch {
  query: string;
  savedAt: string;
}

const MULTI_SPACE_REGEX = /\s+/g;

/** Normalizes whitespace so equivalent queries are stored as one entry. */
export function normalizeSavedSearchQuery(query: string): string {
  return query.trim().replace(MULTI_SPACE_REGEX, " ");
}

function toComparableQuery(query: string): string {
  return normalizeSavedSearchQuery(query).toLowerCase();
}

export function isSameSavedSearchQuery(left: string, right: string): boolean {
  return toComparableQuery(left) === toComparableQuery(right);
}

function isSavedSearch(value: unknown): value is SavedSearch {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedSearch>;
  return (
    typeof candidate.query === "string" && typeof candidate.savedAt === "string"
  );
}

function toNormalizedSavedSearch(search: SavedSearch): SavedSearch | null {
  const normalizedQuery = normalizeSavedSearchQuery(search.query);
  if (!normalizedQuery) return null;
  const savedAtDate = new Date(search.savedAt);
  return {
    query: normalizedQuery,
    savedAt: Number.isNaN(savedAtDate.getTime())
      ? new Date(0).toISOString()
      : savedAtDate.toISOString(),
  };
}

function sanitizeSavedSearches(searches: SavedSearch[]): SavedSearch[] {
  const normalizedSearches = searches
    .map(toNormalizedSavedSearch)
    .filter((search): search is SavedSearch => Boolean(search))
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const uniqueSearches: SavedSearch[] = [];
  const seenQueries = new Set<string>();

  for (const search of normalizedSearches) {
    const queryKey = toComparableQuery(search.query);
    if (seenQueries.has(queryKey)) continue;
    seenQueries.add(queryKey);
    uniqueSearches.push(search);

    if (uniqueSearches.length >= MAX_SAVED_SEARCHES) {
      break;
    }
  }

  return uniqueSearches;
}

export function readSavedSearches(storage: Storage): SavedSearch[] {
  try {
    const raw = storage.getItem(SAVED_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sanitizeSavedSearches(parsed.filter(isSavedSearch));
  } catch {
    return [];
  }
}

export function writeSavedSearches(
  storage: Storage,
  searches: SavedSearch[],
): boolean {
  const normalizedSearches = sanitizeSavedSearches(searches);
  try {
    storage.setItem(
      SAVED_SEARCHES_STORAGE_KEY,
      JSON.stringify(normalizedSearches),
    );
    return true;
  } catch {
    return false;
  }
}

export function upsertSavedSearch(
  searches: SavedSearch[],
  query: string,
  now: Date = new Date(),
): SavedSearch[] {
  const normalizedQuery = normalizeSavedSearchQuery(query);
  if (!normalizedQuery) return sanitizeSavedSearches(searches);

  const nextSearches = searches.filter(
    (search) => !isSameSavedSearchQuery(search.query, normalizedQuery),
  );
  nextSearches.unshift({
    query: normalizedQuery,
    savedAt: now.toISOString(),
  });

  return sanitizeSavedSearches(nextSearches);
}

export function removeSavedSearch(
  searches: SavedSearch[],
  query: string,
): SavedSearch[] {
  const normalizedQuery = normalizeSavedSearchQuery(query);
  if (!normalizedQuery) return sanitizeSavedSearches(searches);

  const nextSearches = searches.filter(
    (search) => !isSameSavedSearchQuery(search.query, normalizedQuery),
  );
  return sanitizeSavedSearches(nextSearches);
}

export function buildSavedSearchUrl(baseUrl: string, query: string): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const resultsPageUrl = `${normalizedBaseUrl}${SAVED_SEARCH_RESULTS_PATH}`;
  const normalizedQuery = normalizeSavedSearchQuery(query);
  if (!normalizedQuery) return resultsPageUrl;
  const params = new URLSearchParams({
    [SAVED_SEARCH_QUERY_PARAM]: normalizedQuery,
  });
  return `${resultsPageUrl}?${params.toString()}`;
}

export function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
