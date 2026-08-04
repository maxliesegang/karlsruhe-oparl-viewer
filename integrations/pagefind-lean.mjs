import { createReadStream } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { close, createIndex } from "pagefind";

/**
 * Pagefind indexing that keeps extracted PDF text out of the built site.
 *
 * `AuxiliaryFiles.astro` renders the full extracted text of every attachment.
 * That text is ~61% of all paper HTML (~276 MB), but it is also what makes the
 * documents findable, so it can neither stay nor simply be dropped.
 *
 * This integration resolves that by ordering the two operations: every page is
 * handed to Pagefind **as rendered**, and only afterwards is the text removed
 * from the file on disk. The indexed bytes are therefore identical to what a
 * plain `addDirectory()` run would have seen — losslessness holds by
 * construction, with no re-escaping step that could silently drift — while the
 * deployed HTML ships an empty container that `file-text-loader.ts` fills from
 * the syndication mirror on demand.
 *
 * Replaces `astro-pagefind`, which only exposes `addDirectory()` and so cannot
 * separate "what gets indexed" from "what gets written".
 */

/**
 * The rendered text container. Astro escapes `<` in the extracted text, so the
 * closing tag cannot occur inside the body and the non-greedy match is exact.
 */
const FILE_TEXT = /(<p class="file-text"([^>]*)>)(.*?)(<\/p>)/gs;

/** Matches the bare `data-file-text` flag, never a longer attribute name. */
const FILE_TEXT_FLAG = /\sdata-file-text(?=[\s=>]|$)/;

/** Empties every lazily-loaded text container, leaving its markup intact. */
export function stripFileText(html) {
  return html.replace(FILE_TEXT, (match, open, attributes, _body, close) =>
    FILE_TEXT_FLAG.test(attributes) ? `${open}${close}` : match,
  );
}

/** Pagefind's own output, which must never be indexed or rewritten. */
const OUTPUT_DIRECTORY = "pagefind";

async function* walkHtml(directory, isRoot = true) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (isRoot && entry.isDirectory() && entry.name === OUTPUT_DIRECTORY) {
      continue;
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walkHtml(entryPath, false);
    else if (entry.isFile() && entry.name.endsWith(".html")) yield entryPath;
  }
}

function formatMegabytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Enough to serve the Pagefind bundle; the dev server handles everything else. */
const CONTENT_TYPES = {
  ".js": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".wasm": "application/wasm",
};

export default function pagefindLean() {
  return {
    name: "pagefind-lean",
    hooks: {
      /**
       * `astro dev` never runs a build, so the index it searches is whatever
       * `scripts/ensure-pagefind-index.mjs` last wrote into `dist/`. Serve that
       * directory at `/pagefind/` so the client module resolves in dev too.
       */
      "astro:server:setup": ({ server, logger }) => {
        // `server` is the Vite dev server, whose `root` is already a plain
        // absolute path — unlike Astro's own config, where it is a file URL.
        const outDir = path.resolve(
          server.config.root,
          server.config.build.outDir,
        );
        logger.debug(`Serving Pagefind from ${outDir}`);

        server.middlewares.use((request, response, next) => {
          const url = request.url ?? "";
          if (!url.startsWith("/pagefind/")) return next();

          // Resolve inside outDir, so a traversal attempt cannot escape it.
          const requested = path.join(
            outDir,
            decodeURIComponent(url.split("?")[0]),
          );
          if (path.relative(outDir, requested).startsWith("..")) return next();

          stat(requested).then(
            (stats) => {
              if (!stats.isFile()) return next();
              const type = CONTENT_TYPES[path.extname(requested)];
              if (type) response.setHeader("Content-Type", type);
              createReadStream(requested).pipe(response);
            },
            () => next(),
          );
        });
      },

      "astro:build:done": async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const { index, errors: createErrors } = await createIndex();
        if (!index) {
          createErrors.forEach((error) => logger.error(error));
          throw new Error("Pagefind failed to create an index");
        }

        let pageCount = 0;
        let strippedPages = 0;
        let strippedBytes = 0;

        for await (const filePath of walkHtml(outDir)) {
          const rendered = await readFile(filePath, "utf8");

          // Pagefind derives the result URL from this path, so it must stay
          // relative to the output root — the same URLs `addDirectory()` produced.
          const sourcePath = path.relative(outDir, filePath);
          const { errors } = await index.addHTMLFile({
            sourcePath,
            content: rendered,
          });
          if (errors.length) {
            errors.forEach((error) => logger.error(`${sourcePath}: ${error}`));
            throw new Error(`Pagefind failed to index ${sourcePath}`);
          }
          pageCount += 1;

          const lean = stripFileText(rendered);
          if (lean.length === rendered.length) continue;

          // Only reached once this page is indexed, which is what keeps the
          // index complete while the written file loses its text.
          await writeFile(filePath, lean);
          strippedPages += 1;
          strippedBytes +=
            Buffer.byteLength(rendered) - Buffer.byteLength(lean);
        }

        logger.info(
          `Indexed ${pageCount} pages, then stripped ${formatMegabytes(strippedBytes)} of extracted text from ${strippedPages} of them`,
        );

        const { outputPath, errors: writeErrors } = await index.writeFiles({
          outputPath: path.join(outDir, "pagefind"),
        });
        if (writeErrors.length) {
          writeErrors.forEach((error) => logger.error(error));
          throw new Error("Pagefind failed to write the index");
        }
        logger.info(`Pagefind wrote the index to ${outputPath}`);
        await close();
      },
    },
  };
}
