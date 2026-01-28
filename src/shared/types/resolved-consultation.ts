import type { AgendaItem } from "./agenda-item.ts";
import type { Consultation } from "./consultation.ts";
import type { Meeting } from "./meeting.ts";

export interface ResolvedConsultation {
  consultation: Consultation;
  meeting: Meeting | undefined;
  agendaItem: AgendaItem | undefined;
}
