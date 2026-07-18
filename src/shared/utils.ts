/**
 * Trims each entry, drops empties, and de-duplicates — accepting a single
 * string, an array, or a nullish value. Preserves first-seen order.
 */
export function normalizeStringList(
  value: string[] | string | null | undefined,
): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : [];

  return [...new Set(rawValues.map((entry) => entry.trim()).filter(Boolean))];
}

export function normalizeOParlUrl(url: string): string {
  if (url.includes("/ris/")) {
    return url;
  }
  return url.replace("/oparl/", "/ris/oparl/");
}

export const PAPERS_YEAR_QUERY_PARAMETER = "year";

export function buildPapersUrl(baseUrl: string, year?: string | null): string {
  const normalizedYear = year?.trim() ?? "";
  if (!normalizedYear) {
    return `${baseUrl}vorlagen`;
  }

  const params = new URLSearchParams([
    [PAPERS_YEAR_QUERY_PARAMETER, normalizedYear],
  ]);
  return `${baseUrl}vorlagen?${params.toString()}`;
}

export function buildPaperDetailUrl(
  baseUrl: string,
  reference: string,
): string {
  return `${baseUrl}vorlagen/${encodeURIComponent(reference)}`;
}

/** Formats a date string as "dd.MM.yyyy" in German locale. */
export function formatDateShort(date: string | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

/** Formats a date string as "d. MMMM yyyy" in German locale. */
export function formatDateLong(date: string | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Converts a display string (e.g. Stadtteil name) into a URL-safe slug. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
