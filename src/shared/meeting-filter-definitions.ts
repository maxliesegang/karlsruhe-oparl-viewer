export const MEETING_FILTER_IDS = {
  bodyType: "meeting-filter-body-type",
  organization: "meeting-filter-organization",
  district: "meeting-filter-district",
  timeRange: "meeting-filter-time-range",
  month: "meeting-filter-month",
  agenda: "meeting-filter-agenda",
  protocol: "meeting-filter-protocol",
  search: "meeting-filter-search",
  reset: "meeting-filter-reset",
} as const;

export const MEETING_FILTER_QUERY_PARAMETERS = {
  bodyType: "gremientyp",
  organization: "gremium",
  district: "ortschaft",
  timeRange: "zeitraum",
  month: "monat",
  agenda: "tagesordnung",
  protocol: "protokoll",
  search: "q",
} as const;

export const MEETING_TIME_RANGE_OPTIONS = [
  { value: "7", label: "Nächste 7 Tage" },
  { value: "30", label: "Nächste 30 Tage" },
  { value: "90", label: "Nächste 90 Tage" },
] as const;

export const MEETING_AGENDA_OPTIONS = [
  { value: "available", label: "Tagesordnung vorhanden" },
  { value: "missing", label: "Noch nicht veröffentlicht" },
] as const;

export const MEETING_PROTOCOL_OPTIONS = [
  { value: "available", label: "Protokoll vorhanden" },
  { value: "missing", label: "Ohne Protokoll" },
] as const;

/**
 * The upcoming list and the archive share one controller but ask different
 * questions: "how soon?" versus "which month of this year?", "is the agenda out
 * yet?" versus "is the protocol there?".
 */
export type MeetingListVariant = "upcoming" | "archive";

export type MeetingSelectFilterKey =
  "organization" | "district" | "timeRange" | "month" | "agenda" | "protocol";

export interface MeetingSelectFilterDefinition {
  key: MeetingSelectFilterKey;
  id: string;
  label: string;
  /** Label of the "no selection" entry; `FilterSelect` falls back to "Alle". */
  emptyLabel?: string;
}

const ORGANIZATION_FILTER: MeetingSelectFilterDefinition = {
  key: "organization",
  id: MEETING_FILTER_IDS.organization,
  label: "Gremium",
};

const DISTRICT_FILTER: MeetingSelectFilterDefinition = {
  key: "district",
  id: MEETING_FILTER_IDS.district,
  label: "Ortschaft",
};

export const MEETING_SELECT_FILTERS: readonly MeetingSelectFilterDefinition[] =
  [
    ORGANIZATION_FILTER,
    DISTRICT_FILTER,
    {
      key: "timeRange",
      id: MEETING_FILTER_IDS.timeRange,
      label: "Zeitraum",
      emptyLabel: "Alle kommenden",
    },
    {
      key: "agenda",
      id: MEETING_FILTER_IDS.agenda,
      label: "Tagesordnung",
    },
  ];

export const MEETING_ARCHIVE_SELECT_FILTERS: readonly MeetingSelectFilterDefinition[] =
  [
    ORGANIZATION_FILTER,
    DISTRICT_FILTER,
    {
      key: "month",
      id: MEETING_FILTER_IDS.month,
      label: "Monat",
      emptyLabel: "Ganzes Jahr",
    },
    {
      key: "protocol",
      id: MEETING_FILTER_IDS.protocol,
      label: "Protokoll",
    },
  ];

export function getMeetingSelectFilters(
  variant: MeetingListVariant,
): readonly MeetingSelectFilterDefinition[] {
  return variant === "archive"
    ? MEETING_ARCHIVE_SELECT_FILTERS
    : MEETING_SELECT_FILTERS;
}
