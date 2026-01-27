import type { AgendaItem } from "./agenda-item.ts";
import type { AuxiliaryFile } from "./auxiliary-file.ts";
import type { Entity } from "./entity.ts";
import type { Location } from "./location.ts";

export interface Meeting extends Entity {
  type: string;
  name: string;
  start: string;
  end: string;
  location: Location;
  organization: string[];
  created: string;
  modified: string;
  invitation?: AuxiliaryFile;
  resultsProtocol?: AuxiliaryFile;
  auxiliaryFile?: AuxiliaryFile[];
  agendaItem: AgendaItem[];
}
