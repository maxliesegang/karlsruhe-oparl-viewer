export const MEETING_FILTER_IDS = {
  bodyType: "meeting-filter-body-type",
  organization: "meeting-filter-organization",
  district: "meeting-filter-district",
  timeRange: "meeting-filter-time-range",
  agenda: "meeting-filter-agenda",
  search: "meeting-filter-search",
  reset: "meeting-filter-reset",
} as const;

export const MEETING_FILTER_QUERY_PARAMETERS = {
  bodyType: "gremientyp",
  organization: "gremium",
  district: "ortschaft",
  timeRange: "zeitraum",
  agenda: "tagesordnung",
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

export type MeetingSelectFilterKey =
  "organization" | "district" | "timeRange" | "agenda";

export interface MeetingSelectFilterDefinition {
  key: MeetingSelectFilterKey;
  id: string;
  label: string;
}

export const MEETING_SELECT_FILTERS: readonly MeetingSelectFilterDefinition[] =
  [
    {
      key: "organization",
      id: MEETING_FILTER_IDS.organization,
      label: "Gremium",
    },
    {
      key: "district",
      id: MEETING_FILTER_IDS.district,
      label: "Ortschaft",
    },
    {
      key: "timeRange",
      id: MEETING_FILTER_IDS.timeRange,
      label: "Zeitraum",
    },
    {
      key: "agenda",
      id: MEETING_FILTER_IDS.agenda,
      label: "Tagesordnung",
    },
  ];
