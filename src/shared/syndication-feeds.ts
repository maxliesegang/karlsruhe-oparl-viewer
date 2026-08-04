import { SYNDICATION_BASE_URL } from "./constants";
import type { SyndicationFeed } from "./types";

export const ALL_UPDATES_FEED_URL = `${SYNDICATION_BASE_URL}tagesordnungspunkte.xml`;

const FEED_TITLE_PREFIX = /^Tagesordnungspunkte\s+[–-]\s+/;

export interface SyndicationFeedCatalog {
  committeeFeeds: SyndicationFeed[];
  districtFeeds: SyndicationFeed[];
  committeeFeedByOrganizationId: ReadonlyMap<string, SyndicationFeed>;
  districtFeedByName: ReadonlyMap<string, SyndicationFeed>;
}

function isSupportedFeed(feed: SyndicationFeed): boolean {
  return (
    (feed.type === "committee" || feed.type === "district") &&
    Boolean(feed.id) &&
    Boolean(feed.url)
  );
}

export function getSyndicationFeedLabel(feed: SyndicationFeed): string {
  return feed.type === "district"
    ? feed.id
    : feed.title.replace(FEED_TITLE_PREFIX, "");
}

export function buildSyndicationFeedCatalog(
  rawFeeds: SyndicationFeed[],
): SyndicationFeedCatalog {
  const feeds = rawFeeds
    .filter(isSupportedFeed)
    .sort((left, right) =>
      getSyndicationFeedLabel(left).localeCompare(
        getSyndicationFeedLabel(right),
        "de",
      ),
    );
  const committeeFeeds = feeds.filter((feed) => feed.type === "committee");
  const districtFeeds = feeds.filter((feed) => feed.type === "district");

  return {
    committeeFeeds,
    districtFeeds,
    committeeFeedByOrganizationId: new Map(
      committeeFeeds.map((feed) => [feed.id, feed]),
    ),
    districtFeedByName: new Map(districtFeeds.map((feed) => [feed.id, feed])),
  };
}
