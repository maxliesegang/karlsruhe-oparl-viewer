export const MEETING_BODY_TYPES = [
  "Gemeinderat",
  "Ortschaftsrat",
  "Ausschuss",
  "Beirat",
  "Sonstiges",
] as const;

export type MeetingBodyType = (typeof MEETING_BODY_TYPES)[number];

export interface MeetingFilterValues {
  bodyTypes: MeetingBodyType[];
  organizations: string[];
  organizationLabel: string;
  districts: string[];
  location: string;
  searchText: string;
  publicAgendaCount: number;
}

export interface MeetingFilterOptions {
  bodyTypes: MeetingBodyType[];
  organizations: string[];
  districts: string[];
}
