# GemeinderatsRadar

GemeinderatsRadar is an Astro-powered web application designed to provide insights and structured information about local council agendas, documents, and consultations. The application fetches, organizes, and displays data from sources like the OParl standard, making it more accessible to interested citizens.

## Live Demo

Visit the live application: [https://maxliesegang.github.io/karlsruhe-oparl-viewer/](https://maxliesegang.github.io/karlsruhe-oparl-viewer/)

## About OParl

[OParl](https://oparl.org/) is an open standard for parliamentary information systems in Germany. It defines a standardized API for accessing information about local councils, their meetings, documents, and decisions, making government data more transparent and accessible.

## Purpose

This project specifically focuses on making the council data from Karlsruhe, Germany more accessible and user-friendly. It transforms the raw OParl data into an intuitive interface where citizens can easily browse, search, and understand local government activities and decisions.

---

## Features

- **Document Listings:** View all published council papers with details such as title, reference number, date, and type.
- **Consultations Details:** Display the agenda, organization roles, and results for consultations tied to meetings.
- **Search Functionality:** Search through available data using the integrated [`astro-pagefind`](https://github.com/astro-community/astro-pagefind) component.
- **Filter and Explore:** Easily explore council documents or even jump to the specific reference details.
- **Responsive Design:** Optimized for an accessible experience across all device types.

## Project Structure

The folder structure follows the Astro framework's best practices:

```plaintext
/
├── public/           # Public assets, available at the root URL
├── src/              # Source code
│   ├── components/   # Reusable UI components (Astro and TypeScript)
│   ├── layouts/      # Layout components for templates
│   ├── pages/        # Astro pages (e.g., index, detail pages)
│   ├── shared/       # Shared code such as types, stores, and utilities
│   └── styles/       # Global styles and shared CSS
└── package.json      # Node.js package dependencies and scripts
```

## Key Technologies

- **Astro Framework**: Fast and modern web development framework.
- **TypeScript**: A statically typed superset of JavaScript to ensure type safety.
- **`astro-pagefind`**: Enables fast and feature-rich search on static Astro sites.
- **CSS**: Modern and flexible styling for the UI components.

## 🧞 Available Scripts

Run these commands in your terminal, from the root of the project:

| Command           | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `npm install`     | Install all project dependencies                       |
| `npm run dev`     | Start a development server at `localhost:4321`         |
| `npm run build`   | Build the project for production in the `dist/` folder |
| `npm run preview` | Serve the built production output locally              |
| `npm run format`  | Automatically format the code with Prettier            |

## Deployment

This project is ready to be deployed to any static hosting provider. The build output resides in the `dist/` folder. Providers like [Netlify](https://www.netlify.com/), [Vercel](https://vercel.com/), and [GitHub Pages](https://pages.github.com/) are excellent choices.

To build for production:

```bash
npm run build
```

Then upload the contents of the `dist` directory to your hosting provider.

### Deploying to GitHub Pages

This project is currently deployed on GitHub Pages. To deploy your own version:

1. Fork the repository
2. Enable GitHub Pages in your repository settings
3. Configure GitHub Actions to build and deploy the project by creating a workflow file (e.g., `.github/workflows/deploy.yml`) with the appropriate build and deployment steps
4. Alternatively, you can manually build the project and push the `dist` directory to the `gh-pages` branch:

```bash
npm run build
# Install gh-pages if you haven't already
npm install -g gh-pages
# Deploy to GitHub Pages
gh-pages -d dist
```

## Data Sources

The application fetches its data from external JSON resources that conform to the OParl standard. Below are the primary data sources loaded into the application:

- **Organizations:** Used for identifying organizational entities related to papers and consultations.
- **Meetings:** Includes details about schedules, participants, and locations.
- **Papers:** Refers to council documents displayed to users, each with metadata such as its type, date, title, etc.

## File Breakdown

### Key Files

- **`astro.config.mjs`**: Config file for Astro, integrating features like `astro-pagefind`.
- **Layouts:** Contains basic markup and styling for consistent UI across pages.
- **TypeScript Models:** Define interfaces for structured data, such as `AgendaItem`, `Meeting`, and `Organization`.
- **Stores:** The stores (e.g., `PapersStore`, `MeetingsStore`) fetch and manage JSON data for application usage.

## Example Usage

### Running Locally

1. Clone the repository.

```bash
git clone https://github.com/maxliesegang/karlsruhe-oparl-viewer.git
cd karlsruhe-oparl-viewer
```

2. Install dependencies.

```bash
npm install
```

3. Start the local development server.

```bash
npm run dev
```

Visit `http://localhost:4321` in your web browser to access the app.

### Fetching Paper Details

Search for council papers via the landing page or explore the list of all papers using the "Drucksachen" section. Click on an individual paper to drill down into its details.

## Contribution

Contributions are welcome! If you'd like to report a bug, suggest new features, or submit a pull request, please ensure you follow the steps below:

1. Clone the repository.
2. Create a feature branch.
3. Commit your changes following conventional commit standards.
4. Submit a pull request with a clear description of your changes.

Please ensure all code follows the formatting rules specified in `.prettierrc.mjs`. Use `npm run format` to automatically apply these rules.

## License

This project is licensed under the [MIT License](LICENSE). See the file for more information.

---

Enjoy building with GemeinderatsRadar! 🚀
