/**
 * Inlines the start page's first result batch into `index.html`, computed
 * from the Pagefind index the build just wrote (see `search-snapshot.ts`).
 *
 * Run by `integrations/pagefind-lean.mjs` after indexing, as a separate Node
 * process: it loads the browser bundle the same way the eval scripts do,
 * outside Astro's Vite config loader. Can also be run by hand on a `dist/`:
 *
 *   node scripts/write-search-snapshot.mjs [distDir] [base]
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadNodePagefind } from "./lib/pagefind-node.mjs";
import {
  buildSearchSnapshot,
  injectSearchSnapshot,
} from "../src/shared/search-snapshot.ts";
import { SEARCH_RESULT_BATCH_SIZE } from "../src/shared/constants.ts";

const distDir = path.resolve(process.argv[2] ?? "dist");
const baseUrl = process.argv[3] ?? "/karlsruhe-oparl-viewer/";
const pagePath = path.join(distDir, "index.html");

const { pagefind } = await loadNodePagefind(process.cwd(), {
  distDir,
  baseUrl,
});
const snapshot = await buildSearchSnapshot(pagefind, SEARCH_RESULT_BATCH_SIZE);
const html = injectSearchSnapshot(await readFile(pagePath, "utf8"), snapshot);
if (html === undefined) {
  console.error(`No empty search snapshot placeholder in ${pagePath}`);
  process.exit(1);
}
await writeFile(pagePath, html);
console.log(
  `Inlined ${snapshot.results.length} of ${snapshot.total} start-page results into index.html (${(Buffer.byteLength(JSON.stringify(snapshot)) / 1024).toFixed(1)} KB)`,
);
