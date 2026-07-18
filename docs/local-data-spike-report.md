# Local syndication ingestion spike report

Tested 2026-07-18 on macOS against syndication commit
`643fc2e4d7d07b92ecddd7e62cd66d1d740b294d`.

## Existing implementation

- `DATA_BASE_URL` is a fixed raw.githubusercontent URL in
  `src/shared/constants.ts`.
- `src/shared/data.ts` has module-level caches for papers, meetings,
  organizations, file contents, districts, years, and derived counts.
- Array stores and `paper-stadtteile.json` are fetched directly. HTTP failures
  previously logged an error and returned an empty array/object.
- File content metadata comes from `file-contents.json`. The loader then probes
  exactly 50 chunk URLs (`chunk-0.json` through `chunk-49.json`) concurrently;
  this is a fixed upper bound, not batches over a discovered list.
- Consultations are not loaded from `consultations.json`; paper consultation
  references are resolved against agenda items embedded in meetings.
- `.github/workflows/deploy.yml` builds with `withastro/action@v3`, then a
  dependent job deploys with `actions/deploy-pages@v4`. Pushes to `main`, two
  daily schedules, and manual dispatch trigger that production workflow.

## Results

The current, unsharded local checkout built 27,507 pages successfully. A test
layout replacing `papers.json` with three `papers/part-*.json` array shards
built the same 27,507 pages without loader changes.

One-run quick-build measurements on the same host and data generation:

| Source                      | Wall time | Maximum RSS |
| --------------------------- | --------: | ----------: |
| Existing remote HTTP/chunks |   28.16 s |     3.07 GB |
| Local files/per-file text   |   25.10 s |     2.19 GB |

The local path was 3.06 s (10.9%) faster and used 0.88 GB (28.6%) less peak
RSS in this run. These are indicative single-run developer-machine numbers;
CI checkout time is not included and should be measured separately.

The full local build completed in 94.77 s with 2.85 GB maximum RSS. Pagefind
indexed 27,505 pages and wrote its index. An exact word taken from extracted
PDF text (`Abbiegeassistenzsystemen`) was present in rendered HTML and a
Pagefind query returned its paper as the sole result.

## Cost and limitations

The prototype adds a 134-line source abstraction, a 36-line manual-only CI
workflow, and a 27-line loader contract, while simplifying the main loader by
26 net lines and removing the chunk-count constant.

The production deploy workflow and `DATA_BASE_URL` default are unchanged.
Remote remains the default and uses single JSON stores plus per-file text over
HTTP. Remote shard discovery is not implemented because a raw GitHub directory
has no listing endpoint; sharded operation is therefore a local-source
contract. Fetching every text file remotely is expected to be much less
efficient than the old chunks and is retained only as a fallback.
