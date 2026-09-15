import {
  buildMeetingDigestUrl,
  parseMeetingDigestLeads,
} from "./meeting-digest";
import type { MeetingDigest, MeetingDigestLead } from "./types";
import { formatDateLong } from "./utils";

/**
 * Loads a meeting's generated preview from the syndication mirror after the page
 * has rendered.
 *
 * Previews are the one entity the viewer deliberately does **not** build in.
 * They are written seven days and one day before a sitting — both of which fall
 * between two deploys — so a built-in preview would be missing exactly while it
 * is worth reading. Secondarily it keeps prose out of `dist/` that would grow by
 * ~3 kB for every sitting from here on, against a standing size budget
 * (see `AGENTS.md`).
 *
 * The section is rendered hidden and only revealed once a preview arrives, so a
 * sitting without one (most of them) shows nothing rather than an empty card.
 */

const SECTION_SELECTOR = "[data-meeting-digest]";

function selectText(root: ParentNode, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-meeting-digest-${name}]`);
}

function isMeetingDigest(value: unknown): value is MeetingDigest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MeetingDigest>;
  return (
    typeof candidate.overview === "string" &&
    candidate.overview.trim() !== "" &&
    (candidate.highlights === undefined || Array.isArray(candidate.highlights))
  );
}

async function fetchDigest(
  meetingId: string,
  lead: MeetingDigestLead,
): Promise<MeetingDigest | undefined> {
  const source = buildMeetingDigestUrl(meetingId, lead);
  try {
    const response = await fetch(source);
    // A sitting simply has no preview at this lead time — the common case.
    if (response.status === 404) return undefined;
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const payload: unknown = await response.json();
    return isMeetingDigest(payload) ? payload : undefined;
  } catch (error) {
    console.warn(`Could not load the meeting preview from ${source}`, error);
    return undefined;
  }
}

/** Model and prompt version make a preview reproducible; readers do not need them. */
function buildProvenance(digest: MeetingDigest): string {
  return [digest.model, digest.promptVersion, digest.provider]
    .filter(Boolean)
    .join(" · ");
}

function buildNote(digest: MeetingDigest, isPast: boolean): string {
  const generatedAt = formatDateLong(digest.generatedAt);
  const sentences = [
    isPast
      ? `Vor der Sitzung automatisch erzeugt${generatedAt ? ` am ${generatedAt}` : ""}.`
      : `Automatisch erzeugt${generatedAt ? ` am ${generatedAt}` : ""}.`,
    "Kann Fehler enthalten — maßgeblich sind die Originalunterlagen.",
  ];
  const uncovered = digest.uncoveredCount ?? 0;
  if (uncovered > 0) {
    sentences.push(
      uncovered === 1
        ? "Ein öffentlicher Tagesordnungspunkt ist hier nicht berücksichtigt."
        : `${uncovered} öffentliche Tagesordnungspunkte sind hier nicht berücksichtigt.`,
    );
  }
  return sentences.join(" ");
}

/**
 * Fills the section. Every value goes in as `textContent`: the preview is a
 * generated document fetched from another site and must never be parsed as HTML.
 */
function render(
  section: HTMLElement,
  digest: MeetingDigest,
  isPast: boolean,
): void {
  const overview = selectText(section, "overview");
  if (overview) overview.textContent = digest.overview;

  const highlights = (digest.highlights ?? []).filter(
    (highlight): highlight is string =>
      typeof highlight === "string" && highlight.trim() !== "",
  );
  const points = selectText(section, "points");
  const pointsHeading = selectText(section, "points-heading");
  if (points) {
    points.replaceChildren(
      ...highlights.map((highlight) => {
        const item = document.createElement("li");
        item.textContent = highlight;
        return item;
      }),
    );
    points.hidden = highlights.length === 0;
  }
  if (pointsHeading) pointsHeading.hidden = highlights.length === 0;

  const badge = selectText(section, "badge");
  const provenance = buildProvenance(digest);
  if (badge && provenance) badge.title = provenance;

  const note = selectText(section, "note");
  if (note) note.textContent = buildNote(digest, isPast);

  section.hidden = false;
}

async function loadMeetingDigest(section: HTMLElement): Promise<void> {
  const meetingId = section.dataset.meetingId;
  const leads = parseMeetingDigestLeads(section.dataset.meetingDigestLeads);
  if (!meetingId || leads.length === 0) return;

  const isPast = section.dataset.meetingDigestPast === "true";
  // Leads are tried best-first and sequentially: the first hit is the one that
  // renders, so requesting the fallback in parallel would usually be wasted.
  for (const lead of leads) {
    const digest = await fetchDigest(meetingId, lead);
    if (digest) {
      render(section, digest, isPast);
      return;
    }
  }
}

export function initMeetingDigestLoader(root: ParentNode = document): void {
  for (const section of root.querySelectorAll<HTMLElement>(SECTION_SELECTOR)) {
    void loadMeetingDigest(section);
  }
}
