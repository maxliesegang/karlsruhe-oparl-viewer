import type { Entity } from "./entity.ts";

export interface Consultation extends Entity {
  type: string;
  paper?: string;
  agendaItem: string;
  meeting: string;
  organization: string[];
  role: string;
  created: string;
  modified: string;
}
