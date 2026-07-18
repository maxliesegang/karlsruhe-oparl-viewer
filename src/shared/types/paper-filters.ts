export interface PaperFilterMetadata {
  year: string;
  organizationNames: string;
  lastRole: string;
  lastResult: string;
  districtNamesLabel: string;
  districtFilterValue: string;
}

export interface PaperFilterOptions {
  years: string[];
  paperTypes: string[];
  organizations: string[];
  roles: string[];
  results: string[];
  districts: string[];
}
