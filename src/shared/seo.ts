/**
 * Helpers for the search-engine metadata every page emits through
 * `Layout.astro`. Kept free of Astro imports so `tests/` can exercise them.
 */

/** Google truncates descriptions well before this; cut on a word boundary. */
const META_DESCRIPTION_MAX_LENGTH = 160;

export function truncateForMetaDescription(
  text: string,
  maxLength: number = META_DESCRIPTION_MAX_LENGTH,
): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  const hardCut = collapsed.slice(0, maxLength - 1);
  const lastSpace = hardCut.lastIndexOf(" ");
  const body =
    lastSpace > maxLength / 2 ? hardCut.slice(0, lastSpace) : hardCut;
  return `${body.replace(/[\s,;:.\-–—]+$/, "")}…`;
}

/**
 * `build.format: "file"` means some routes are emitted as `foo.html`. Crawlers
 * reach them through the extensionless links the site itself uses, so the
 * canonical URL has to drop the extension — otherwise every page competes with
 * a duplicate of itself.
 */
export function canonicalizePathname(pathname: string): string {
  const withoutIndex = pathname.replace(/index\.html$/, "");
  const withoutExtension = withoutIndex.replace(/\.html$/, "");
  return withoutExtension === "" ? "/" : withoutExtension;
}

export function buildCanonicalUrl(
  url: URL | undefined,
  site: URL | undefined,
): string | undefined {
  if (!url || !site) {
    return undefined;
  }

  return new URL(canonicalizePathname(url.pathname), site).href;
}

const PAPER_TYPE_FALLBACK = "Vorlage";

/**
 * Search snippets for paper pages. The generated summary is by far the most
 * useful thing we have; without one, fall back to the bibliographic facts so
 * the snippet still differs from every other paper page.
 */
export function buildPaperDescription(paper: {
  reference: string;
  name: string;
  paperType?: string;
  date?: string;
  summary?: string;
}): string {
  if (paper.summary?.trim()) {
    return truncateForMetaDescription(paper.summary);
  }

  const parts = [
    `${paper.paperType?.trim() || PAPER_TYPE_FALLBACK} ${paper.reference}`,
    paper.name,
    paper.date ? `vom ${formatGermanDate(paper.date)}` : "",
    "im Karlsruher Gemeinderat",
  ].filter(Boolean);
  return truncateForMetaDescription(parts.join(" – "));
}

/** Meeting pages: committee, date and how many agenda items are published. */
export function buildMeetingDescription(meeting: {
  name: string;
  start?: string;
  agendaItemCount: number;
}): string {
  const date = meeting.start ? formatGermanDate(meeting.start) : "";
  const agenda =
    meeting.agendaItemCount > 0
      ? `${meeting.agendaItemCount} Tagesordnungspunkte`
      : "Tagesordnung";
  const parts = [
    meeting.name,
    date ? `am ${date}` : "",
    `– ${agenda} mit Vorlagen und Unterlagen aus dem Karlsruher Gemeinderat.`,
  ].filter(Boolean);
  return truncateForMetaDescription(parts.join(" "));
}

function formatGermanDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}
