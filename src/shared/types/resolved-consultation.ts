import type { AgendaItem } from "./agenda-item.ts";
import type { Consultation } from "./consultation.ts";
import type { Meeting } from "./meeting.ts";
import type { Paper } from "./paper.ts";

export interface ResolvedConsultation {
  consultation: Consultation;
  meeting: Meeting | undefined;
  agendaItem: AgendaItem | undefined;
}

export interface ResolvedAgendaItem {
  agendaItem: AgendaItem;
  paper: Paper | undefined;
}
