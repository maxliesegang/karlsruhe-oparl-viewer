/**
 * Short notes for the dismissible hint in the page corner. One is picked at
 * random per visit; it persists across in-site navigation and closing it
 * hides it until the page is reloaded (see `isFreshSiteVisit`).
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

/**
 * The site is a multi-page app, so every link is a full page load. To make
 * the hint behave like in a single-page app, a load counts as a fresh start
 * only on reload or when arriving from outside the site; in-site navigation
 * and back/forward keep the current hint (or its dismissal).
 */
export function isFreshSiteVisit(
  navigationType: string | undefined,
  referrer: string,
  origin: string,
): boolean {
  if (navigationType === "reload") return true;
  if (navigationType === "back_forward") return false;
  try {
    return new URL(referrer).origin !== origin;
  } catch {
    return true;
  }
}
