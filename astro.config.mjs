// @ts-check
import pagefind from "astro-pagefind";
import { defineConfig } from "astro/config";

const PAGES_BASE = "/karlsruhe-oparl-viewer/";
const runningInCi =
  process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const isDev = process.env.NODE_ENV === "development" && !runningInCi;
const skipPagefind = ["1", "true", "yes"].includes(
  (process.env.SKIP_PAGEFIND ?? "").toLowerCase(),
);
const integrations = skipPagefind ? [] : [pagefind()];

// https://astro.build/config
export default defineConfig({
  site: "https://maxliesegang.github.io",
  base: isDev ? "/" : PAGES_BASE,
  build: {
    format: "file",
  },
  integrations,
});
