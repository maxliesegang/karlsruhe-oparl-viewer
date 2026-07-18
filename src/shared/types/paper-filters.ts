export interface PaperFilterValues {
  year: string;
  organization: string;
  consultationRole: string;
  consultationResult: string;
  districtLabel: string;
  districts: string;
}

export interface PaperFilterOptions {
  years: string[];
  paperTypes: string[];
  organizations: string[];
  roles: string[];
  results: string[];
  districts: string[];
}
