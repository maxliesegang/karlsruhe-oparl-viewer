/** Published by the scraper as docs/paper-submitters.json. */
export interface PaperSubmitter {
  id: string;
  name: string;
}

export interface PaperSubmitterIndex {
  version: number;
  factions: Record<string, string>;
  papers: Record<string, string[]>;
}
