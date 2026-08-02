# Agent Guide — GemeinderatsRadar (updated Feb 2026)

## Project Snapshot

- **Name:** GemeinderatsRadar (`karlsruhe-oparl-viewer`)
- **Purpose:** Static Astro site for browsing Karlsruhe council papers from an OParl JSON mirror
- **Stack:** Astro 7.1.x, TypeScript strict, Node 24.x, npm with `package-lock.json`
- **Formatting:** Prettier 3 + `prettier-plugin-astro` (`npm run format`)
- **Hosting:** GitHub Pages via `.github/workflows/deploy.yml`

## Run Book

```
npm ci                    # install (preferred over npm install)
npm run dev               # dev server → http://localhost:4321
npm run build:quiet       # ← use this one: full build, per-page log lines filtered
npm run build:quick:quiet # quiet + no Pagefind (fastest validation)
npm run build             # full build incl. Pagefind index → dist/ (~30k log lines)
npm run build:quick       # fast build, skips Pagefind (SKIP_PAGEFIND=1)
npm run preview           # preview built site
npm run format            # Prettier
```

**Always prefer `build:quiet` over `build`.** The site generates ~30,000 pages
and `astro build` logs one line per page: ~30,000 lines / 1.5 MB (~370k tokens)
per run, of which ~17 lines carry information. `build:quick` does _not_ help —
`SKIP_PAGEFIND=1` only skips indexing, the per-page logging is identical.
`build:quiet` (`scripts/build-quiet.mjs`) drops those lines, keeps the summary,
errors, and exit code, and reports how many lines it suppressed.

Do **not** edit generated artifacts: `dist/`, `.astro/`, `node_modules/`.

## Astro Upgrade Steps

1. `npm outdated --long` — check what's behind
2. Read the Astro release notes for the target version
3. `npx @astrojs/upgrade` — run the official upgrader
4. `npm outdated --long` — verify dependency state
5. Validate both build paths: `npm run build:quick:quiet` then `npm run build:quiet`
6. Commit `package.json` and `package-lock.json` together

> When touching env flags, cast `import.meta.env.*` before string operations
> and prefer explicit checks such as `=== "true"` or `=== "1"`.

## Deployment

- Workflow: `.github/workflows/deploy.yml`
- Triggers: push to `main`; scheduled 03:00 and 15:00 UTC
- Uses `withastro/action@v3` + `actions/deploy-pages@v4`
- Deploy always runs `npm run build` so Pagefind assets are present in production
- **Never commit `dist/`**

## Common Pitfalls

- Builds fail unless `syndication-data/docs` exists (`npm run data:setup`); there is no network fallback
- Missing `BASE_URL` prefixes break GitHub Pages subpath routing
- Astro upgrades can expose implicit `import.meta.env` type assumptions — cast before calling string methods

### Output-Volume Traps

`dist/` (~45k files, 858 MB) and `syndication-data/` (~93k files, 773 MB) are
gitignored, so Grep and Glob correctly ignore them — the searchable source tree
is ~80 files. Bash and Read do **not** consult `.gitignore`, so these still bite:

- `npm run build` — see the Run Book; use `build:quiet`
- **Never read `dist/vorlagen.html`** — it is a single ~11 MB file
- Do not `ls`/`find` inside `syndication-data/docs/file-contents/` (76k files) or
  `syndication-data/docs/papers/` (14k files) without a `head`/`-name` filter
- Inspect data shape from one shard file (~4–9 KB each), not from a directory listing

## Sub-directory Guides

Focused documentation lives closer to the code it describes:

- [`src/AGENTS.md`](src/AGENTS.md) — routing map, URL conventions, legacy redirects, pages overview
- [`src/components/AGENTS.md`](src/components/AGENTS.md) — component catalog, reuse patterns, Pagefind/filter contracts
- [`src/shared/AGENTS.md`](src/shared/AGENTS.md) — data flow, loaders, filter derivation, type extensions
