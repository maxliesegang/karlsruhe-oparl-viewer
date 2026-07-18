# Local syndication data loader contract (spike)

Set `DATA_SOURCE=local`. `DATA_LOCAL_DIR` is resolved from the viewer working
directory and defaults to `syndication-data/docs`.

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

`DATA_SOURCE=remote` remains the default and keeps using `DATA_BASE_URL`. It
loads the single-file array stores and per-file text paths over HTTP; remote
shard discovery is intentionally not part of this spike.
