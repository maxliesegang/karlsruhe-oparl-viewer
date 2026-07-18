import type { PaperFilterOptions } from "./types";

export const PAPER_FILTER_IDS = {
  year: "filter-year",
  paperType: "filter-type",
  organization: "filter-org",
  consultationRole: "filter-role",
  consultationResult: "filter-result",
  district: "filter-stadtteil",
} as const;

export type PaperFilterKey = keyof typeof PAPER_FILTER_IDS;

export interface PaperFilterFieldDefinition {
  key: PaperFilterKey;
  id: (typeof PAPER_FILTER_IDS)[PaperFilterKey];
  label: string;
  optionsKey: keyof PaperFilterOptions;
  dataAttribute: string;
  multipleValues?: boolean;
}

export const PAPER_FILTER_FIELDS: readonly PaperFilterFieldDefinition[] = [
  {
    key: "year",
    id: PAPER_FILTER_IDS.year,
    label: "Jahr",
    optionsKey: "years",
    dataAttribute: "year",
  },
  {
    key: "paperType",
    id: PAPER_FILTER_IDS.paperType,
    label: "Art",
    optionsKey: "paperTypes",
    dataAttribute: "paper-type",
  },
  {
    key: "organization",
    id: PAPER_FILTER_IDS.organization,
    label: "Unter Leitung von",
    optionsKey: "organizations",
    dataAttribute: "organization",
  },
  {
    key: "consultationRole",
    id: PAPER_FILTER_IDS.consultationRole,
    label: "Letzte Rolle",
    optionsKey: "roles",
    dataAttribute: "role",
  },
  {
    key: "consultationResult",
    id: PAPER_FILTER_IDS.consultationResult,
    label: "Letztes Beratungsergebnis",
    optionsKey: "results",
    dataAttribute: "result",
  },
  {
    key: "district",
    id: PAPER_FILTER_IDS.district,
    label: "Erwähnter Stadtteil",
    optionsKey: "districts",
    dataAttribute: "districts",
    multipleValues: true,
  },
];
