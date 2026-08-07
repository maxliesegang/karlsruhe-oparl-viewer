/** Published by the scraper as docs/paper-submitters.json. */
export interface PaperSubmitter {
  id: string;
  name: string;
}

/**
 * One faction credited on a paper. `factionId` is absent for factions without a
 * `/fraktion/[name]` page, so callers render the name without linking it.
 */
export interface ResolvedPaperSubmitter {
  name: string;
  factionId?: string;
}

export interface PaperSubmitterIndex {
  version: number;
  factions: Record<string, string>;
  papers: Record<string, string[]>;
}
