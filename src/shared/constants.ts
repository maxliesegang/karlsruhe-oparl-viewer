export const DATA_BASE_URL =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs";

/**
 * Papers modified on this date had their `modified` field set during a bulk import,
 * so we use the paper's own `date` field to determine the relevant year instead.
 */
export const BULK_MODIFIED_DATE = "2025-03-03";
