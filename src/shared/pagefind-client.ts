import { normalizeSavedSearchQuery } from "./saved-searches";
import { getDateTimestamp } from "./utils";

export interface PagefindResultData {
  url?: string;
  excerpt?: string;
  meta?: Record<string, string | undefined>;
  word_count?: number;
}

export interface PagefindSearchResult {
  id?: string;
  data?: () => Promise<PagefindResultData>;
}

export interface PagefindSearchOptions {
  sort?: Record<string, "asc" | "desc">;
  filters?: Record<string, string[]>;
}

interface PagefindSearchResponse {
  results?: PagefindSearchResult[];
}

export interface PagefindFreshnessStats {
  total: number;
  newCount: number;
  updatedCount: number;
}

export interface PagefindModule {
  search: (
    term: string,
    options?: PagefindSearchOptions,
  ) => Promise<PagefindSearchResponse>;
  options?: (options: Record<string, unknown>) => Promise<void>;
}

const pagefindModulePromises = new Map<string, Promise<PagefindModule>>();

function getPagefindBundlePath(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBaseUrl}pagefind/`;
}

export async function loadPagefindModule(
  baseUrl: string,
): Promise<PagefindModule> {
  const bundlePath = getPagefindBundlePath(baseUrl);
  let modulePromise = pagefindModulePromises.get(bundlePath);

  if (!modulePromise) {
    const moduleUrl = `${bundlePath}pagefind.js`;
    modulePromise = import(/* @vite-ignore */ moduleUrl).then(
      (module) => module as PagefindModule,
    );
    pagefindModulePromises.set(bundlePath, modulePromise);
  }

  return modulePromise;
}

export async function getPagefindFreshnessStats(
  baseUrl: string,
  query: string,
  since: string,
): Promise<PagefindFreshnessStats> {
  const normalizedQuery = normalizeSavedSearchQuery(query);
  if (!normalizedQuery) return { total: 0, newCount: 0, updatedCount: 0 };

  const pagefindModule = await loadPagefindModule(baseUrl);
  const response = await pagefindModule.search(normalizedQuery, {
    sort: { modified: "desc" },
  });
  const results = Array.isArray(response.results) ? response.results : [];
  const cutoff = getDateTimestamp(since) ?? 0;
  let newCount = 0;
  let updatedCount = 0;

  for (const result of results) {
    const data = await result.data?.().catch(() => undefined);
    const created = getDateTimestamp(data?.meta?.["paper-created"]);
    const modified = getDateTimestamp(data?.meta?.["paper-modified"]);
    if (modified !== undefined && modified <= cutoff) break;
    if (created !== undefined && created > cutoff) {
      newCount += 1;
    } else if (modified !== undefined && modified > cutoff) {
      updatedCount += 1;
    }
  }

  return { total: results.length, newCount, updatedCount };
}
