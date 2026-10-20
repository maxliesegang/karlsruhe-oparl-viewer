/**
 * Short notes for the dismissible hint in the page corner. One is picked at
 * random on every page load; closing it only hides it until the next load.
 */
export const SITE_HINTS: readonly string[] = [
  "Kein Mensch ist illegal",
  "Transrechte sind Menschenrechte",
  "Dieser Service ist nicht für Faschisten",
  "Vielfalt ist unsere Stärke",
  "Liebe ist Liebe",
  "Solidarität statt Spaltung",
  "Menschenwürde ist unverhandelbar",
];

export function pickSiteHint(
  hints: readonly string[] = SITE_HINTS,
  random: () => number = Math.random,
): string | undefined {
  if (hints.length === 0) return undefined;
  return hints[Math.floor(random() * hints.length)];
}
