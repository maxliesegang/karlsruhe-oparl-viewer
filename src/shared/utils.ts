export function correctUrl(url: string): string {
  if (url.includes("/ris/")) {
    return url;
  }
  return url.replace("/oparl/", "/ris/oparl/");
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
