import type { PaperFilterOptions } from "./types";

export const PAPER_FILTER_IDS = {
  year: "filter-year",
  type: "filter-type",
  org: "filter-org",
  role: "filter-role",
  result: "filter-result",
  stadtteil: "filter-stadtteil",
} as const;

export interface PaperFilterFieldDefinition {
  id: (typeof PAPER_FILTER_IDS)[keyof typeof PAPER_FILTER_IDS];
  label: string;
  optionsKey: keyof PaperFilterOptions;
}

export const PAPER_FILTER_FIELDS: PaperFilterFieldDefinition[] = [
  { id: PAPER_FILTER_IDS.year, label: "Jahr", optionsKey: "years" },
  { id: PAPER_FILTER_IDS.type, label: "Art", optionsKey: "paperTypes" },
  {
    id: PAPER_FILTER_IDS.org,
    label: "Unter Leitung von",
    optionsKey: "organizations",
  },
  { id: PAPER_FILTER_IDS.role, label: "Letzte Rolle", optionsKey: "roles" },
  {
    id: PAPER_FILTER_IDS.result,
    label: "Letztes Beratungsergebnis",
    optionsKey: "results",
  },
  {
    id: PAPER_FILTER_IDS.stadtteil,
    label: "Erwähnter Stadtteil",
    optionsKey: "stadtteile",
  },
];
