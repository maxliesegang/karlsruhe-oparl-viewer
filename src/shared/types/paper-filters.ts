export interface PaperFilterValues {
  year: string;
  organization: string;
  consultationRole: string;
  consultationResult: string;
  districtLabel: string;
  districts: string;
  submitterLabel: string;
  submitters: string;
}

export interface PaperFilterOptions {
  years: string[];
  paperTypes: string[];
  organizations: string[];
  roles: string[];
  results: string[];
  districts: string[];
  submitters: Array<{ value: string; label: string }>;
}
