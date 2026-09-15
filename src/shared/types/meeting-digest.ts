/** Lead time at which the scraper generated a preview of an upcoming sitting. */
export type MeetingDigestLead = "week" | "day";

/**
 * LLM-generated preview of one sitting, produced by the syndication scraper from
 * the per-paper summaries its public agenda items consult. Only sittings that
 * were upcoming while the generator ran have one, at either or both lead times,
 * so treat it as optional everywhere.
 *
 * Unlike every other entity the viewer shows, this one is **not** loaded into the
 * page at build time — `meeting-digest-loader.ts` fetches it from the mirror in
 * the browser. See `src/components/AGENTS.md`.
 */
export interface MeetingDigest {
  /** `<meeting id>-<lead>` — the two lead times are separate documents. */
  id: string;
  meetingId: string;
  meetingName: string;
  meetingStart: string;
  lead: MeetingDigestLead;
  /** Two to four sentences framing the whole sitting. */
  overview: string;
  /** Three to six points, each traceable to one agenda item. */
  highlights: string[];
  generatedAt: string;
  model?: string;
  provider?: string;
  promptVersion?: string;
  sourceHash?: string;
  /** Papers whose summary fed this preview, by record basename. */
  sourcePapers?: string[];
  /** Public, numbered agenda items that had no current summary to contribute. */
  uncoveredCount?: number;
}
