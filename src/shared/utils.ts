import type { Paper } from "./types/paper";
import { papersStore } from "./stores";

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

/**
 * Papers modified on this date had their `modified` field set during a bulk import,
 * so we use the paper's own `date` field to determine the relevant year instead.
 */
const BULK_MODIFIED_DATE = "2025-03-03";

/** Returns the year a paper should be filed under, accounting for bulk-import dates. */
export function getRelevantYear(paper: Paper): string {
  if (paper.modified.startsWith(BULK_MODIFIED_DATE)) {
    return paper.date.slice(0, 4);
  }
  return paper.modified.slice(0, 4);
}

/** Returns all distinct years that have papers, sorted ascending. */
export async function getAllAvailableYears(): Promise<string[]> {
  const papers = await papersStore.getAllPapers();
  return Array.from(
    new Set(papers.map((paper) => getRelevantYear(paper))),
  ).sort();
}
