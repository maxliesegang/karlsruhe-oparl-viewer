import type { Meeting } from "./types";

/** One entry of the archive overview: a calendar year and how many meetings it holds. */
export interface MeetingArchiveYear {
  year: string;
  count: number;
}

export interface MeetingMonthOption {
  value: string;
  label: string;
}

/**
 * A local copy of `getDateTimestamp` keeps this module import-free, the way
 * `seo.ts` stays importable from `tests/` without pulling in the data layer.
 */
function getStartTimestamp(start: string | undefined): number | undefined {
  if (!start) return undefined;
  const timestamp = new Date(start).getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  month: "long",
});

const MONTH_LABELS = Array.from({ length: 12 }, (_, index) =>
  MONTH_LABEL_FORMATTER.format(new Date(Date.UTC(2001, index, 15))),
);

/**
 * Year and month are derived from the same timestamp the cards print, so a
 * meeting never lands in a bucket that contradicts its displayed date.
 */
export function getMeetingYear(start: string | undefined): string {
  const timestamp = getStartTimestamp(start);
  return timestamp === undefined
    ? ""
    : String(new Date(timestamp).getFullYear());
}

/** Zero-padded month ("01"…"12") so the value sorts as a string. */
export function getMeetingMonth(start: string | undefined): string {
  const timestamp = getStartTimestamp(start);
  if (timestamp === undefined) return "";
  return String(new Date(timestamp).getMonth() + 1).padStart(2, "0");
}

export function getMeetingMonthLabel(month: string): string {
  const index = Number(month) - 1;
  return MONTH_LABELS[index] ?? "";
}

export function hasMeetingProtocol(meeting: Meeting): boolean {
  return Boolean(meeting.resultsProtocol ?? meeting.verbatimProtocol);
}

/** Newest year first — the archive is browsed backwards from the present. */
export function buildMeetingArchiveYears(
  meetings: Meeting[],
): MeetingArchiveYear[] {
  const countsByYear = new Map<string, number>();

  for (const meeting of meetings) {
    const year = getMeetingYear(meeting.start);
    if (!year) continue;
    countsByYear.set(year, (countsByYear.get(year) ?? 0) + 1);
  }

  return [...countsByYear.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((left, right) => right.year.localeCompare(left.year));
}

export function filterMeetingsByYear(
  meetings: Meeting[],
  year: string,
): Meeting[] {
  return meetings.filter((meeting) => getMeetingYear(meeting.start) === year);
}

/** Only the months a year actually has, in calendar order. */
export function buildMeetingMonthOptions(
  meetings: Meeting[],
): MeetingMonthOption[] {
  const months = new Set(
    meetings.map((meeting) => getMeetingMonth(meeting.start)).filter(Boolean),
  );

  return [...months]
    .sort()
    .map((value) => ({ value, label: getMeetingMonthLabel(value) }));
}

export function buildMeetingArchiveUrl(baseUrl: string): string {
  return `${baseUrl}sitzungen/archiv`;
}

export function buildMeetingArchiveYearUrl(
  baseUrl: string,
  year: string,
): string {
  return `${baseUrl}sitzungen/archiv/${encodeURIComponent(year)}`;
}
