// @ts-check
import pagefind from "astro-pagefind";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://maxliesegang.github.io",
  base: "karlsruhe-oparl-viewer/",
  build: {
    format: "file",
  },
  integrations: [pagefind()],
});
