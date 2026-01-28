import type { AuxiliaryFile } from "./auxiliary-file.ts";
import type { Entity } from "./entity.ts";

export interface AgendaItem extends Entity {
  type: string;
  meeting: string;
  number: string;
  order: number;
  name: string;
  public: boolean;
  consultation?: string;
  result?: string;
  created: string;
  modified: string;
  auxiliaryFile?: AuxiliaryFile[];
}
