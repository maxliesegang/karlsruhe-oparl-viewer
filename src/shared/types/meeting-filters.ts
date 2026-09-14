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
  /** Zero-padded month ("01"…"12"); drives the archive month filter. */
  month: string;
  hasProtocol: boolean;
}

export interface MeetingFilterOptions {
  bodyTypes: MeetingBodyType[];
  organizations: string[];
  districts: string[];
  /** Only populated for archive lists, where meetings sit inside one year. */
  months: { value: string; label: string }[];
}
