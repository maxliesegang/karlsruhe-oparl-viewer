import type { Meeting } from "./meeting.ts";

export interface Consultation {
  id: string;
  type: string;
  paper?: string;
  agendaItem: string;
  meeting: string;
  meetingObject: Meeting;
  organization: string[];
  role: string;
  created: string;
  modified: string;
}
