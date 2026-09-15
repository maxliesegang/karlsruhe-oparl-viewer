import { SYNDICATION_BASE_URL } from "./constants.ts";
import type { MeetingDigestLead } from "./types";

/**
 * Lead times in preference order. Both documents describe the same sitting, but
 * the day-before preview sees the final agenda, so it wins wherever both exist.
 */
export const MEETING_DIGEST_LEADS: MeetingDigestLead[] = ["day", "week"];

const LEAD_SEPARATOR = ",";

function isMeetingDigestLead(value: string): value is MeetingDigestLead {
  return (MEETING_DIGEST_LEADS as string[]).includes(value);
}

/** Record basename on the mirror: `digests/meetings/<meeting id>-<lead>.json`. */
export function getMeetingDigestRecordId(
  meetingId: string,
  lead: MeetingDigestLead,
): string {
  return `${meetingId}-${lead}`;
}

/**
 * Which lead times the browser should try for one meeting, best first.
 *
 * `knownLeads` is what the checkout held when the page was built. For a sitting
 * that is still ahead that is only a lower bound: previews are generated seven
 * days and one day out, both of which can fall between two deploys, so an
 * upcoming sitting always tries every lead time. A past sitting tries only what
 * the build saw — previews are never written for it afterwards, and guessing
 * would cost every archive page a pair of 404s.
 *
 * An empty result means no preview section is rendered at all.
 */
export function selectMeetingDigestLeads(options: {
  knownLeads: readonly MeetingDigestLead[];
  isUpcoming: boolean;
}): MeetingDigestLead[] {
  if (options.isUpcoming) return [...MEETING_DIGEST_LEADS];
  return MEETING_DIGEST_LEADS.filter((lead) =>
    options.knownLeads.includes(lead),
  );
}

/** Serializes leads for the `data-meeting-digest-leads` attribute. */
export function formatMeetingDigestLeads(
  leads: readonly MeetingDigestLead[],
): string {
  return leads.join(LEAD_SEPARATOR);
}

/** Reads the attribute back, dropping anything this build does not know. */
export function parseMeetingDigestLeads(
  value: string | undefined,
): MeetingDigestLead[] {
  return (value ?? "")
    .split(LEAD_SEPARATOR)
    .map((entry) => entry.trim())
    .filter(isMeetingDigestLead);
}

/**
 * Where the syndication mirror publishes one generated preview.
 *
 * The viewer's other runtime dependency on the mirror, `buildFileTextUrl`, lives
 * in `utils.ts`; this one stays here beside the record-id rule it shares, which
 * keeps the module free of Astro-resolved imports so `tests/` can pin the URL
 * against the mirror's actual layout.
 */
export function buildMeetingDigestUrl(
  meetingId: string,
  lead: MeetingDigestLead,
): string {
  return `${SYNDICATION_BASE_URL}digests/meetings/${encodeURIComponent(
    getMeetingDigestRecordId(meetingId, lead),
  )}.json`;
}
