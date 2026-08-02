import type { AgendaItem } from "./agenda-item.ts";
import type { AuxiliaryFile } from "./auxiliary-file.ts";
import type { Entity } from "./entity.ts";
import type { Location } from "./location.ts";

export interface Meeting extends Entity {
  type: string;
  name: string;
  start: string;
  end: string;
  location?: Location | null;
  organization?: string[] | null;
  created: string;
  modified: string;
  invitation?: AuxiliaryFile | null;
  resultsProtocol?: AuxiliaryFile | null;
  verbatimProtocol?: AuxiliaryFile | null;
  auxiliaryFile?: AuxiliaryFile[] | null;
  agendaItem?: AgendaItem[] | null;
  deleted?: boolean;
}
