export interface PaperFilterData {
  organizationNames: string;
  lastRole: string;
  lastResult: string;
  stadtteileLabel: string;
  stadtteileFilterValue: string;
}

export interface PaperFilterOptions {
  paperTypes: string[];
  organizations: string[];
  roles: string[];
  results: string[];
  stadtteile: string[];
}
