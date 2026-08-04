export type SyndicationFeedType = "committee" | "district";

export interface SyndicationFeed {
  entryCount: number;
  id: string;
  path: string;
  title: string;
  type: SyndicationFeedType;
  url: string;
}
