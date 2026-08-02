import { PAGEFIND_ROOT_SELECTOR, type PagefindSort } from "./pagefind-config";

interface PagefindSearchOptions {
  filters?: Record<string, string[]>;
  sort?: PagefindSort;
  [key: string]: unknown;
}

export interface PagefindRawResult {
  id: string;
  [key: string]: unknown;
}

interface PagefindSearchResponse {
  results: PagefindRawResult[];
  [key: string]: unknown;
}

interface PagefindApi {
  search: (
    term: string | null,
    options?: PagefindSearchOptions,
  ) => Promise<PagefindSearchResponse>;
}

interface PagefindComponentInstance {
  __pagefind__?: PagefindApi;
  triggerLoad: () => Promise<void>;
}

interface PagefindComponentsApi {
  getInstanceManager: () => {
    getInstance: (name?: string) => PagefindComponentInstance;
  };
}

declare global {
  interface Window {
    PagefindComponents?: PagefindComponentsApi;
  }
}

const HYBRID_RANKING = {
  rankOffset: 60,
  relevanceWeight: 0.8,
  recencyWeight: 0.2,
} as const;

type PagefindSearch = PagefindApi["search"];
const originalSearches = new WeakMap<PagefindApi, PagefindSearch>();
const pendingPatches = new WeakMap<PagefindApi, Promise<void>>();

function haveSameSort(
  left: PagefindSort | undefined,
  right: PagefindSort,
): boolean {
  if (!left) return false;

  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  return (
    leftEntries.length === rightEntries.length &&
    rightEntries.every(([key, value]) => left[key] === value)
  );
}

async function getPagefindSearch(): Promise<PagefindApi | undefined> {
  const searchbox = document.querySelector<HTMLElement>(PAGEFIND_ROOT_SELECTOR);
  if (!searchbox) return;

  await customElements.whenDefined("pagefind-searchbox");

  const pagefindComponents = window.PagefindComponents;
  if (!pagefindComponents) return;

  const instanceName = searchbox.getAttribute("instance") ?? undefined;
  const instance = pagefindComponents
    .getInstanceManager()
    .getInstance(instanceName);

  await instance.triggerLoad();
  return instance.__pagefind__;
}

async function patchPagefindSearch(
  createSearch: (search: PagefindSearch) => PagefindSearch,
): Promise<void> {
  const pagefind = await getPagefindSearch();
  if (!pagefind) return;

  const pendingPatch = pendingPatches.get(pagefind);
  if (pendingPatch) {
    await pendingPatch;
  }

  const originalSearch =
    originalSearches.get(pagefind) ?? pagefind.search.bind(pagefind);
  originalSearches.set(pagefind, originalSearch);

  const patch = Promise.resolve().then(() => {
    pagefind.search = createSearch(originalSearch);
  });
  pendingPatches.set(pagefind, patch);

  try {
    await patch;
  } finally {
    if (pendingPatches.get(pagefind) === patch) {
      pendingPatches.delete(pagefind);
    }
  }
}

/**
 * Pagefind's Component UI does not currently expose result sorting. Patch the
 * underlying search call before the first query so saved searches can behave
 * like a newest-first feed.
 */
export async function configurePagefindResultSort(
  sort: PagefindSort,
): Promise<void> {
  await patchPagefindSearch(
    (search) =>
      (term, options = {}) =>
        search(term, { ...options, sort }),
  );
}

export function fusePagefindResultRanks(
  relevanceResults: PagefindRawResult[],
  recencyResults: PagefindRawResult[],
): PagefindRawResult[] {
  const recencyRanks = new Map<string, number>();
  recencyResults.forEach((result, index) => {
    if (!recencyRanks.has(result.id)) {
      recencyRanks.set(result.id, index + 1);
    }
  });

  return relevanceResults
    .map((result, index) => {
      const relevanceRank = index + 1;
      const recencyRank = recencyRanks.get(result.id);
      const relevanceScore =
        HYBRID_RANKING.relevanceWeight /
        (HYBRID_RANKING.rankOffset + relevanceRank);
      const recencyScore = recencyRank
        ? HYBRID_RANKING.recencyWeight /
          (HYBRID_RANKING.rankOffset + recencyRank)
        : 0;

      return { result, relevanceRank, score: relevanceScore + recencyScore };
    })
    .sort((a, b) => b.score - a.score || a.relevanceRank - b.relevanceRank)
    .map(({ result }) => result);
}

/** Blend Pagefind relevance with a smaller newest-first influence. */
export async function configurePagefindHybridRanking(
  sort: PagefindSort,
): Promise<void> {
  await patchPagefindSearch((search) => async (term, options = {}) => {
    if (haveSameSort(options.sort, sort)) {
      return search(term, options);
    }

    const relevancePromise = search(term, options);
    const recencyPromise = search(term, { ...options, sort }).catch(() => null);
    const [relevance, recency] = await Promise.all([
      relevancePromise,
      recencyPromise,
    ]);

    if (!recency) return relevance;

    return {
      ...relevance,
      results: fusePagefindResultRanks(relevance.results, recency.results),
    };
  });
}
