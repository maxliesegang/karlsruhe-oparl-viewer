# Local syndication data loader contract (spike)

A local checkout is the only data path. `DATA_LOCAL_DIR` is resolved from the
viewer working directory and defaults to `syndication-data/docs`.

Run `npm run data:setup` to create the checkout, then use `npm run dev`,
`npm run build`, or `npm run build:quick`.

For every array store requested by the viewer, provide exactly one of:

- `<entity>.json`, containing one JSON array; or
- `<entity>/*.json`, where every regular file ending in `.json` contains either
  one entity object or a JSON array of entities. Files are read in lexicographic
  filename order and their entities are concatenated.

If both forms exist, the single file wins. Shard counts and names are not fixed;
an empty shard directory is an error. Files must be UTF-8 JSON. NDJSON is
rejected. A top-level single `<entity>.json` must remain an array; individual
objects are accepted only inside the entity directory. The current viewer
requests `papers`, `meetings`, `organizations`, and `file-contents` as array
stores.

Optional per-record documents (currently `summaries/papers/<paper id>.json`) are
discovered by enumerating their directory; a missing directory or file is not an
error, since summaries are backfilled over time.

`paper-stadtteile.json` remains a single UTF-8 JSON object.

For extracted PDF text, `file-contents.json` is the index. For every entry whose
`hasExtractedText` is true, the loader takes the final non-empty path segment of
the entry's absolute `id` URL and reads `file-contents/<fileId>.txt` as UTF-8.
Missing text files are tolerated and summarized as a build warning. No chunk
directory is read.

The viewer never fetches data over the network — per-record directories cannot
be discovered remotely without an index file, so production checks out the data
repository and builds from it.
