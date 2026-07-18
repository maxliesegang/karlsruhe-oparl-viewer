import type { PaperFilterOptions } from "./types";

export const PAPER_FILTER_IDS = {
  year: "filter-year",
  paperType: "filter-type",
  organization: "filter-org",
  consultationRole: "filter-role",
  consultationResult: "filter-result",
  district: "filter-stadtteil",
} as const;

export interface PaperFilterFieldDefinition {
  id: (typeof PAPER_FILTER_IDS)[keyof typeof PAPER_FILTER_IDS];
  label: string;
  optionsKey: keyof PaperFilterOptions;
}

export const PAPER_FILTER_FIELDS: PaperFilterFieldDefinition[] = [
  { id: PAPER_FILTER_IDS.year, label: "Jahr", optionsKey: "years" },
  { id: PAPER_FILTER_IDS.paperType, label: "Art", optionsKey: "paperTypes" },
  {
    id: PAPER_FILTER_IDS.organization,
    label: "Unter Leitung von",
    optionsKey: "organizations",
  },
  {
    id: PAPER_FILTER_IDS.consultationRole,
    label: "Letzte Rolle",
    optionsKey: "roles",
  },
  {
    id: PAPER_FILTER_IDS.consultationResult,
    label: "Letztes Beratungsergebnis",
    optionsKey: "results",
  },
  {
    id: PAPER_FILTER_IDS.district,
    label: "Erwähnter Stadtteil",
    optionsKey: "districts",
  },
];
