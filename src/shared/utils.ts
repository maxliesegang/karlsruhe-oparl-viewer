export function correctUrl(url: string): string {
  if (url.includes("/ris/")) {
    return url;
  }
  return url.replace("/oparl/", "/ris/oparl/");
}

export const VORLAGEN_YEAR_QUERY_PARAM = "year";

export function buildVorlagenUrl(base: string, year?: string | null): string {
  const normalizedYear = year?.trim() ?? "";
  if (!normalizedYear) {
    return `${base}vorlagen`;
  }

  const params = new URLSearchParams([
    [VORLAGEN_YEAR_QUERY_PARAM, normalizedYear],
  ]);
  return `${base}vorlagen?${params.toString()}`;
}

export function buildVorlagenDetailUrl(
  base: string,
  reference: string,
): string {
  return `${base}vorlagen/${encodeURIComponent(reference)}`;
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
