import { normalizeSavedSearchQuery } from "./saved-searches";

interface PagefindSearchResponse {
  results?: unknown[];
}

interface PagefindModule {
  search: (
    term: string,
    options?: Record<string, unknown>,
  ) => Promise<PagefindSearchResponse>;
}

const pagefindModulePromises = new Map<string, Promise<PagefindModule>>();

function getPagefindBundlePath(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBaseUrl}pagefind/`;
}

async function loadPagefindModule(baseUrl: string): Promise<PagefindModule> {
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

export async function getPagefindResultCount(
  baseUrl: string,
  query: string,
): Promise<number> {
  const normalizedQuery = normalizeSavedSearchQuery(query);
  if (!normalizedQuery) return 0;

  const pagefindModule = await loadPagefindModule(baseUrl);
  const result = await pagefindModule.search(normalizedQuery);
  return Array.isArray(result.results) ? result.results.length : 0;
}
