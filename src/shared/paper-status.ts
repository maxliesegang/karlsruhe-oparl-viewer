import type { ResolvedConsultation } from "./types";
import { compareDateStrings, getDateTimestamp } from "./utils";

/** Badge colour key — keep in sync with the `tone-*` classes in `PaperHeader.astro`. */
export type PaperStatusTone =
  "decided" | "scheduled" | "discussed" | "published";

export interface PaperStatus {
  tone: PaperStatusTone;
  label: string;
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

/**
 * Where a paper stands in the council process. A recorded agenda-item result
 * outranks everything — a paper can be decided and still have later
 * consultations scheduled.
 */
export function derivePaperStatus(
  consultations: readonly ResolvedConsultation[],
  now: number = Date.now(),
): PaperStatus {
  const tone: PaperStatusTone = consultations.some(({ agendaItem }) =>
    Boolean(agendaItem?.result?.trim()),
  )
    ? "decided"
    : consultations.some(({ meeting }) => isUpcomingMeeting(meeting, now))
      ? "scheduled"
      : consultations.length > 0
        ? "discussed"
        : "published";

  return { tone, label: STATUS_LABELS[tone] };
}
