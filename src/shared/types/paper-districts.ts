/** District classifications published by the syndication index. */
export interface PaperDistrictEntry {
  primary?: string[];
  mentioned?: string[];
}

/** Version 2 shape of `paper-stadtteile.json`. */
export interface PaperDistrictIndex {
  version: number;
  districts: string[];
  papers: Record<string, PaperDistrictEntry>;
}
