import { BULK_MODIFIED_DATE } from "./constants.ts";

/**
 * Detail-page rules for the import artifacts in paper data. Import-free apart
 * from constants, so `tests/` can load it without the data layer.
 */

/**
 * A `modified` timestamp from the bulk import is not a change anyone made —
 * see `paper-grouping.ts`. Displays omit it rather than present it as one.
 */
export function isBulkImportTimestamp(value: string | undefined): boolean {
  return Boolean(value?.startsWith(BULK_MODIFIED_DATE));
}

/** Values in `underDirectionOf` left by the migration, not real offices. */
export const PLACEHOLDER_OFFICES: ReadonlySet<string> = new Set([
  "_Fachbereich Datenübernahme",
  "Offen",
]);

/**
 * A consultation role worth printing beside the meeting: not empty, not the
 * RIS placeholder "unbekannt", and not the same word as the result printed
 * below it ("Kenntnisnahme" twice).
 */
export function getConsultationRoleLabel(
  role: string | undefined,
  result: string,
): string {
  const trimmed = role?.trim() ?? "";
  if (!trimmed || trimmed.toLocaleLowerCase("de-DE") === "unbekannt") return "";
  return trimmed === result ? "" : trimmed;
}

function toTimestamp(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

/**
 * Where a paper's timeline starts. `created` is normally the publication
 * moment, to the minute. For papers migrated from the old system it is the
 * migration day instead — years after the paper was debated. When `created`
 * postdates the first consultation, the paper's own date is the truthful start,
 * shown without a time because the source has none.
 */
export function getPaperTimelineStart(
  paper: { created: string; date: string },
  firstMeetingStart: string | undefined,
): { value: string; precise: boolean } {
  const created = toTimestamp(paper.created);
  const firstMeeting = toTimestamp(firstMeetingStart);
  const createdAfterDebate =
    created !== undefined &&
    firstMeeting !== undefined &&
    created > firstMeeting;

  if (
    (created === undefined || createdAfterDebate) &&
    toTimestamp(paper.date)
  ) {
    return { value: paper.date, precise: false };
  }
  return { value: paper.created, precise: true };
}

/** A file's "changed" date, unless it is the import stamp or its creation day. */
export function getMeaningfulModified(file: {
  created?: string;
  modified?: string;
}): string {
  const modified = file.modified ?? "";
  if (!toTimestamp(modified) || isBulkImportTimestamp(modified)) return "";
  return modified.slice(0, 10) === (file.created ?? "").slice(0, 10)
    ? ""
    : modified;
}

export interface KeyPointSourceLink {
  /** OParl `File` id — the attachment card on the page carries it as `data-id`. */
  file: string;
  /** The attachment's own label, e.g. "Stellungnahme". */
  name: string;
  /** The located passage, highlighted in the attachment's text on click. */
  quote: string;
  /** 1-based PDF page, when the extracted text had page markers. */
  page?: number;
  /** `accessUrl#page=N`, only when both are known. */
  pageHref?: string;
}

/**
 * One source per key point, index-aligned, `undefined` where there is no source
 * or the file is not (or no longer) among the paper's attachments.
 *
 * The primary target is the passage itself in the attachment's extracted text
 * on the same page — that works whether or not the page is known (most archive
 * texts have no page markers). The PDF page is a secondary link.
 *
 * `accessUrl`, never `downloadUrl`: Karlsruhe serves the download with
 * `Content-Disposition: attachment`, so the browser saves the file and drops
 * `#page=`, while `accessUrl` opens inline at that page.
 */
export function buildKeyPointSourceLinks(
  sources:
    | readonly ({ file: string; page?: number; quote: string } | null)[]
    | undefined,
  files: readonly { id: string; name?: string; accessUrl?: string }[],
): (KeyPointSourceLink | undefined)[] {
  return (sources ?? []).map((source) => {
    if (!source) return undefined;
    const file = files.find((candidate) => candidate.id === source.file);
    if (!file) return undefined;
    const page = source.page && source.page > 0 ? source.page : undefined;
    return {
      file: file.id,
      name: file.name || "Dokument",
      quote: source.quote,
      ...(page ? { page } : {}),
      ...(page && file.accessUrl
        ? { pageHref: `${file.accessUrl}#page=${page}` }
        : {}),
    };
  });
}
