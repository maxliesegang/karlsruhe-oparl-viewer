# Agent Guide — GemeinderatsRadar (updated Feb 2026)

## Project Snapshot

- **Name:** GemeinderatsRadar (`karlsruhe-oparl-viewer`)
- **Purpose:** Static Astro site for browsing Karlsruhe council papers from an OParl JSON mirror
- **Stack:** Astro 5.17.x, TypeScript strict, Node 20.x, npm with `package-lock.json`
- **Formatting:** Prettier 3 + `prettier-plugin-astro` (`npm run format`)
- **Hosting:** GitHub Pages via `.github/workflows/deploy.yml`

## Run Book

```
npm ci              # install (preferred over npm install)
npm run dev         # dev server → http://localhost:4321
npm run build       # full build incl. Pagefind index → dist/
npm run build:quick # fast build, skips Pagefind (SKIP_PAGEFIND=1)
npm run preview     # preview built site
npm run format      # Prettier
```

Do **not** edit generated artifacts: `dist/`, `.astro/`, `node_modules/`.

## Astro Upgrade Steps

1. `npm outdated --long` — check what's behind
2. Read the Astro release notes for the target version
3. `npx @astrojs/upgrade` — run the official upgrader
4. `npm outdated --long` — verify dependency state
5. Validate both build paths: `npm run build:quick` then `npm run build`
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

- Offline builds fail unless `DATA_BASE_URL` points to a reachable mirror
- Missing `BASE_URL` prefixes break GitHub Pages subpath routing
- Astro upgrades can expose implicit `import.meta.env` type assumptions — cast before calling string methods

## Sub-directory Guides

Focused documentation lives closer to the code it describes:

- [`src/AGENTS.md`](src/AGENTS.md) — routing map, URL conventions, legacy redirects, pages overview
- [`src/components/AGENTS.md`](src/components/AGENTS.md) — component catalog, reuse patterns, Pagefind/filter contracts
- [`src/shared/AGENTS.md`](src/shared/AGENTS.md) — data flow, loaders, filter derivation, type extensions
