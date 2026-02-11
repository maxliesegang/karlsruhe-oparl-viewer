# GemeinderatsRadar

GemeinderatsRadar is an Astro-powered web application designed to provide insights and structured information about local council agendas, documents, and consultations. The application fetches, organizes, and displays data from sources like the OParl standard, making it more accessible to interested citizens.

## Live Demo

Visit the live application (GitHub Pages):  
https://maxliesegang.github.io/karlsruhe-oparl-viewer/

If you fork this project for GitHub Pages, keep the base path intact by using `import.meta.env.BASE_URL` everywhere (already wired in the codebase).

## About OParl

[OParl](https://oparl.org/) is an open standard for parliamentary information systems in Germany. It defines a standardized API for accessing information about local councils, their meetings, documents, and decisions, making government data more transparent and accessible.

## Purpose

This project focuses on making council data from Karlsruhe, Germany more accessible. It transforms the raw OParl data into an intuitive interface where citizens can browse, search, and understand local government activities and decisions.

## Prerequisites

- Node.js 20.x recommended (matches the GitHub Actions runner).
- npm (lockfile is `package-lock.json`; prefer npm over pnpm/yarn to avoid lock drift).
- Internet access at build time (data is fetched from GitHub Raw; see “Data sources”).

## Quickstart

```bash
npm ci          # or npm install
npm run dev     # http://localhost:4321
```

Build and preview production output:

```bash
npm run build
npm run preview
```

> Tip: run `npm run format` before committing to keep Astro and TypeScript files prettified.

---

## Features

- **Search:** Full-text search via [`astro-pagefind`](https://github.com/astro-community/astro-pagefind) with German UI copy.
- **Per-year listings:** `/vorlagen{year}` shows papers grouped by their relevant year (see bulk-import note below).
- **Detail pages:** `/vorlage/[reference]` includes metadata, consultations, and auxiliary files with extracted text snippets.
- **Responsive layout:** Optimized for mobile and desktop.
- **GitHub Pages ready:** Uses `import.meta.env.BASE_URL` so links work from the repo’s Pages subpath.

## Routes at a Glance

- `/` – landing page with search UI.
- `/vorlagen{year}` – list of papers for the given year (static paths generated from available years).
- `/vorlage/[reference]` – details for a single paper.

## Data Sources

Content is pulled at build time from the public mirror:
`https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs`

- Papers, meetings, organizations, file metadata, and up to 50 file-content chunks are fetched and cached in `src/shared/data.ts`.
- Bulk import: items with `modified` on `2025-03-03` use `paper.date` to determine their year. Changing that date constant may impact routing.

> Building offline will fail unless you point `DATA_BASE_URL` (see `src/shared/constants.ts`) to a reachable mirror.

## Project Structure (short)

```plaintext
src/
  pages/          # Astro entry points and dynamic routes
  components/     # UI building blocks
  layouts/        # Shared layout
  shared/         # data loaders, utils, types
public/           # static assets
```

## Key Technologies

- Astro 5 (static generation).
- TypeScript strict mode.
- `astro-pagefind` for on-site search.
- Prettier + `prettier-plugin-astro` for formatting.

## 🧞 Available Scripts

| Command           | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `npm ci`          | Install dependencies exactly as locked                 |
| `npm run dev`     | Start a development server at `localhost:4321`         |
| `npm run build`   | Build the project for production in the `dist/` folder |
| `npm run preview` | Serve the built production output locally              |
| `npm run format`  | Format the codebase with Prettier                      |

## Deployment

This project builds to static assets and can be hosted on any static provider.

- GitHub Pages: already configured via `.github/workflows/deploy.yml` (runs on `main` pushes and twice daily). Artifacts from the build job are published with `actions/deploy-pages`.
  - In GitHub repository settings (`Settings` → `Pages`), set **Build and deployment** → **Source** to **GitHub Actions**. Otherwise GitHub can also trigger a separate Jekyll workflow (`pages build and deployment`) that is not used by this Astro pipeline.
- Other hosts (Netlify, Vercel, etc.): run `npm run build` and deploy the `dist/` directory.

## Contributing

Contributions are welcome! If you’d like to report a bug, suggest features, or submit a pull request:

1. Create a feature branch.
2. Run `npm run format` before pushing.
3. Describe your changes clearly in the PR.

## File Breakdown

### Key Files

- **`astro.config.mjs`**: Astro project config, including `astro-pagefind`.
- **`src/layouts/Layout.astro`**: Shared page chrome and navigation.
- **`src/shared/data.ts`**: Fetching and caching logic for papers, meetings, organizations, and file contents.
- **`src/shared/utils.ts`**: URL correction and date formatting helpers.
- **`src/shared/types/`**: Type definitions for the fetched data.

## Example Usage

### Running Locally

1. Clone the repository.

```bash
git clone https://github.com/maxliesegang/karlsruhe-oparl-viewer.git
cd karlsruhe-oparl-viewer
```

2. Install dependencies.

```bash
npm ci
```

3. Start the local development server.

```bash
npm run dev
```

Visit `http://localhost:4321` in your web browser to access the app.

### Fetching Paper Details

Search for council papers via the landing page or use the “Vorlagen” navigation link to browse by year. Click on an individual paper to drill down into its details.

## License

This project is licensed under the [MIT License](LICENSE). See the file for more information.

---

Enjoy building with GemeinderatsRadar! 🚀
