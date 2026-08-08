# Local syndication data loader contract

A local checkout is the only data path. `DATA_LOCAL_DIR` is resolved from the
viewer working directory and defaults to `syndication-data/docs`.

Run `npm run data:setup` to create the checkout, then use `npm run dev`,
`npm run build:quiet`, or `npm run build:quick:quiet`. After a full build,
`npm run build:verify` checks that Pagefind exists and the output remains inside
the published-size budget.

For every array store requested by the viewer, provide exactly one of:

- `<entity>.json`, containing one JSON array; or
- `<entity>/*.json`, where every regular file ending in `.json` contains either
  one entity object or a JSON array of entities. Files are read in lexicographic
  filename order and their entities are concatenated.

If both forms exist, the single file wins. Shard counts and names are not fixed;
an empty shard directory is an error. Files must be UTF-8 JSON. NDJSON is
rejected. A top-level single `<entity>.json` must remain an array; individual
objects are accepted only inside the entity directory. The current viewer
requests `papers`, `meetings`, `organizations`, `file-contents`, and
`feed-index` as array stores.

Optional per-record documents (currently `summaries/papers/<paper id>.json`) are
discovered by enumerating their directory; a missing directory or file is not an
error, since summaries are backfilled over time.

`paper-stadtteile.json` remains a single UTF-8 JSON object with the shape
`{ version, districts, papers }`. `districts` is the complete district registry;
`papers` is keyed by the paper record basename (the same final id segment used
by `papers/<id>.json`) and each value may contain `primary` and `mentioned`
string arrays. The viewer combines both arrays for its district browsing pages.
Older reference-keyed objects are still accepted for local compatibility.

For extracted PDF text, the `file-contents` array store is the index. For every
entry whose `hasExtractedText` is true, the loader takes the final non-empty
path segment of the entry's absolute `id` URL and reads
`file-contents/<fileId>.txt` as UTF-8. Missing text files are tolerated and
summarized as a build warning. No chunk directory is read.

The viewer never fetches data over the network — per-record directories cannot
be discovered remotely without an index file, so production checks out the data
repository and builds from it.
