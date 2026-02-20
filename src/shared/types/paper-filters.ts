export interface PaperFilterData {
  year: string;
  organizationNames: string;
  lastRole: string;
  lastResult: string;
  stadtteileLabel: string;
  stadtteileFilterValue: string;
}

export interface PaperFilterOptions {
  years: string[];
  paperTypes: string[];
  organizations: string[];
  roles: string[];
  results: string[];
  stadtteile: string[];
}
