import {
  searchPapers,
  type PagefindModule,
  type PagefindResultData,
} from "./pagefind-client.ts";
import { summaryFromContent } from "./search-presentation.ts";
import {
  effectiveSort,
  filterFields,
  parseSearchState,
  type SearchState,
} from "./search-state.ts";

/**
 * The start page's first result batch, computed at build time from the
 * finished Pagefind index and inlined into `index.html`.
 *
 * With no query and no filter, every visitor sees the same list, yet showing
 * it took the whole Pagefind waterfall: bundle, metadata, WASM, an index chunk
 * and 20 fragments that each carry a paper's full extracted PDF text (~840 KB
 * over six round trips). The snapshot holds only what a card displays, so the
 * list renders as soon as the page script runs. Later batches still come from
 * Pagefind, and the snapshot comes from the same build as the index it skips.
 */
export interface SearchSnapshot {
  total: number;
  results: SnapshotCard[];
}

/** A card's data without the page text; `summary` replaces content/anchors. */
export type SnapshotCard = Pick<PagefindResultData, "url" | "meta"> & {
  summary: string;
};

/** The empty element that `SearchPanel` renders and the build fills. */
const PLACEHOLDER =
  /(<script\b[^>]*\sdata-search-snapshot\b[^>]*>)(<\/script>)/;

/** The view the snapshot stands for: no query, no filter, newest change first. */
export function isSnapshotView(state: SearchState): boolean {
  return (
    !state.q &&
    filterFields.every((field) => !state[field]) &&
    effectiveSort(state) === "modified"
  );
}

export async function buildSearchSnapshot(
  pagefind: PagefindModule,
  count: number,
): Promise<SearchSnapshot> {
  const results = await searchPapers(
    pagefind,
    parseSearchState(new URLSearchParams()),
  );
  const cards = await Promise.all(
    results.slice(0, count).map(async (result) => {
      const data = (await result.data?.()) ?? {};
      return {
        url: data.url,
        meta: data.meta,
        summary: summaryFromContent(data.content ?? "", data.anchors ?? []),
      };
    }),
  );
  return { total: results.length, results: cards };
}

/** Fills the placeholder; `<` is escaped so no value can close the script. */
export function injectSearchSnapshot(
  html: string,
  snapshot: SearchSnapshot,
): string | undefined {
  if (!PLACEHOLDER.test(html)) return undefined;
  const json = JSON.stringify(snapshot).replaceAll("<", "\\u003c");
  return html.replace(PLACEHOLDER, (_, open, close) => open + json + close);
}

export function readSearchSnapshot(
  root: ParentNode,
): SearchSnapshot | undefined {
  const text = root.querySelector("[data-search-snapshot]")?.textContent;
  if (!text?.trim()) return undefined;
  try {
    const snapshot = JSON.parse(text) as SearchSnapshot;
    return Array.isArray(snapshot.results) ? snapshot : undefined;
  } catch {
    return undefined;
  }
}
