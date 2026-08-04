/**
 * Papers modified on this date had their `modified` field set during a bulk import,
 * so we use the paper's own `date` field to determine the relevant year instead.
 */
export const BULK_MODIFIED_DATE = "2025-03-03";

/**
 * Published root of the syndication mirror. It is a separate GitHub Pages site
 * on the same origin as the viewer, which is what lets the browser fetch
 * extracted PDF text at runtime instead of us shipping ~276 MB of it in `dist/`
 * (see `src/shared/file-text-loader.ts`). It also serves `Access-Control-Allow-Origin: *`,
 * so the same fetch works from the dev server.
 */
export const SYNDICATION_BASE_URL =
  "https://maxliesegang.github.io/karlsruhe-oparl-syndication/";
