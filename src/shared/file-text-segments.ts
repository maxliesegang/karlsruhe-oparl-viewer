/**
 * Splits an attachment's extracted text into display segments for the
 * full-screen reader (`file-text-reader.ts`): plain runs, search matches, and
 * the page breaks pdf-parse records as `-- N of M --` lines.
 *
 * Pure and DOM-free so it can be unit tested; the reader turns each segment
 * into a text node, a `<mark>`, or a page divider.
 */

export type FileTextSegment =
  | { kind: "text"; text: string }
  | { kind: "match"; text: string }
  | { kind: "page"; page: number; total: number };

/** pdf-parse closes each page with `-- N of M --` on its own line. */
const PAGE_MARKER = /^-- (\d+) of (\d+) --$/gm;

/** Deep link to the reader: `#text-<fileId>`, the mirror's file id. */
export const FILE_TEXT_HASH_PREFIX = "#text-";

export function buildFileTextHash(fileId: string): string {
  return `${FILE_TEXT_HASH_PREFIX}${encodeURIComponent(fileId)}`;
}

/** Shorter queries would mark nearly every word of a long document. */
export const MINIMUM_QUERY_LENGTH = 2;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pushText(segments: FileTextSegment[], text: string): void {
  if (text) segments.push({ kind: "text", text });
}

/** Splits one marker-free run around case-insensitive matches of `pattern`. */
function splitMatches(
  segments: FileTextSegment[],
  text: string,
  pattern: RegExp | null,
): void {
  if (!pattern) {
    pushText(segments, text);
    return;
  }
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    pushText(segments, text.slice(last, start));
    segments.push({ kind: "match", text: match[0] });
    last = start + match[0].length;
  }
  pushText(segments, text.slice(last));
}

export function normalizeQuery(query: string): string {
  const trimmed = query.trim().replace(/\s+/g, " ");
  return trimmed.length >= MINIMUM_QUERY_LENGTH ? trimmed : "";
}

/**
 * A match never spans a page marker: the marker is not part of the document's
 * prose, and a mark straddling a divider could not be drawn as one element.
 * Whitespace in the query matches any whitespace run, so a phrase still
 * matches across the PDF's line breaks.
 */
export function segmentFileText(text: string, query = ""): FileTextSegment[] {
  const normalized = normalizeQuery(query);
  const pattern = normalized
    ? new RegExp(normalized.split(" ").map(escapeRegExp).join("\\s+"), "giu")
    : null;

  const segments: FileTextSegment[] = [];
  let last = 0;
  for (const marker of text.matchAll(PAGE_MARKER)) {
    const start = marker.index ?? 0;
    splitMatches(segments, text.slice(last, start), pattern);
    segments.push({
      kind: "page",
      page: Number(marker[1]),
      total: Number(marker[2]),
    });
    last = start + marker[0].length;
  }
  splitMatches(segments, text.slice(last), pattern);
  return segments;
}

export interface FileTextStats {
  words: number;
  /** Known only when the extraction kept page markers. */
  pages: number | undefined;
}

export function getFileTextStats(text: string): FileTextStats {
  let pages: number | undefined;
  for (const marker of text.matchAll(PAGE_MARKER)) {
    pages = Math.max(pages ?? 0, Number(marker[2]));
  }
  const prose = text.replace(PAGE_MARKER, " ").trim();
  return { words: prose ? prose.split(/\s+/).length : 0, pages };
}
