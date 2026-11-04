/**
 * Loads the production Pagefind bundle from `dist/` into Node, so scripts can
 * search the real WASM index without a browser or a server.
 *
 * Pagefind fetches its chunks with `fetch()`, which Node cannot do for `file:`
 * URLs, so those are served from disk. `getPagefindFreshnessStats(base, …)`
 * imports the same `file:` module URL and therefore shares this instance.
 */
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function loadNodePagefind(root = process.cwd()) {
  const entry = resolve(root, "dist/pagefind/pagefind.js");
  try {
    await access(entry);
  } catch {
    throw new Error(
      `No Pagefind bundle at ${entry}. Run \`npm run build:quiet\` first.`,
    );
  }

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) =>
    String(url).startsWith("file:")
      ? new Response(await readFile(new URL(url)))
      : originalFetch(url, options);

  const pagefind = await import(pathToFileURL(entry).href);
  const base = pathToFileURL(resolve(root, "dist") + "/").href;
  await pagefind.options({
    bundlePath: `${base}pagefind/`,
    baseUrl: "/karlsruhe-oparl-viewer/",
  });
  await pagefind.init("de");
  return { pagefind, base };
}
