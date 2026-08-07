import type { ResolvedConsultation } from "./types";
import { compareDateStrings, getDateTimestamp } from "./utils";

/** Badge colour key — keep in sync with the `tone-*` classes in `PaperHeader.astro`. */
export type PaperStatusTone =
  "decided" | "scheduled" | "discussed" | "published";

export interface PaperStatus {
  tone: PaperStatusTone;
  label: string;
  /**
   * The one consultation the status is about — the decision if there is one,
   * otherwise the next scheduled date, otherwise the last debate. The label
   * alone says "Zur Beratung vorgesehen" without saying *when* or *where*,
   * which is the first follow-up question for every kind of reader. It needs no
   * label of its own: `label` already names which of the three cases this is.
   *
   * Absent when no consultation qualifies — a paper that is merely published,
   * or one whose consultations have no meeting attached.
   */
  highlight?: ResolvedConsultation;
}

const STATUS_LABELS: Record<PaperStatusTone, string> = {
  decided: "Entschieden",
  scheduled: "Zur Beratung vorgesehen",
  discussed: "Beraten",
  published: "Veröffentlicht",
};

export function isUpcomingMeeting(
  meeting: ResolvedConsultation["meeting"],
  now: number,
): boolean {
  const start = meeting ? getDateTimestamp(meeting.start) : undefined;
  return start !== undefined && start > now;
}

/**
 * Chronological order. Consultations whose meeting is unknown or undated fall
 * back to their own creation date so they still land somewhere sensible.
 */
export function orderConsultations(
  consultations: readonly ResolvedConsultation[],
): ResolvedConsultation[] {
  return [...consultations].sort((left, right) =>
    compareDateStrings(
      left.meeting?.start ?? left.consultation.created,
      right.meeting?.start ?? right.consultation.created,
    ),
  );
}

/** The recorded outcome of a consultation, or `""` when there is none yet. */
export function getConsultationResult(
  consultation: ResolvedConsultation,
): string {
  return consultation.agendaItem?.result?.trim() ?? "";
}

/**
 * Where a paper stands in the council process, and which consultation says so.
 * A recorded agenda-item result outranks everything — a paper can be decided
 * and still have later consultations scheduled — then the next scheduled date,
 * then the last debate. Tone and highlight are the same decision seen twice, so
 * they are derived together rather than by two passes that could drift apart.
 */
export function derivePaperStatus(
  consultations: readonly ResolvedConsultation[],
  now: number = Date.now(),
): PaperStatus {
  const ordered = orderConsultations(consultations);
  const highlight =
    ordered.findLast(getConsultationResult) ??
    ordered.find(({ meeting }) => isUpcomingMeeting(meeting, now)) ??
    ordered.findLast(
      ({ meeting }) => meeting && !isUpcomingMeeting(meeting, now),
    );

  const tone = deriveTone(highlight, consultations.length > 0, now);
  return { tone, label: STATUS_LABELS[tone], highlight };
}

function deriveTone(
  highlight: ResolvedConsultation | undefined,
  hasConsultations: boolean,
  now: number,
): PaperStatusTone {
  // Consultations without any meeting attached still mean the paper has been
  // through committee, even though none of them can be highlighted.
  if (!highlight) return hasConsultations ? "discussed" : "published";
  if (getConsultationResult(highlight)) return "decided";
  return isUpcomingMeeting(highlight.meeting, now) ? "scheduled" : "discussed";
}
