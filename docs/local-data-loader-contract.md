# Local syndication data loader contract (spike)

Local data is the default. `DATA_LOCAL_DIR` is resolved from the viewer working
directory and defaults to `syndication-data/docs`. Set `DATA_SOURCE=remote` only
for a compatible aggregate mirror.

Run `npm run data:setup` to create the default local checkout, then use
`npm run dev:local`, `npm run build:local`, or `npm run build:local:quick`.

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

`paper-stadtteile.json` remains a single UTF-8 JSON object.

For extracted PDF text, `file-contents.json` is the index. For every entry whose
`hasExtractedText` is true, the loader takes the final non-empty path segment of
the entry's absolute `id` URL and reads `file-contents/<fileId>.txt` as UTF-8.
Missing text files are tolerated and summarized as a build warning. No chunk
directory is read.

`DATA_SOURCE=remote` remains available for compatible aggregate stores and uses
`DATA_BASE_URL`. It cannot discover per-record remote directories. Production
therefore checks out the data repository and builds with `DATA_SOURCE=local`.
