import type { Consultation } from "./consultation.ts";
import type { AuxiliaryFile } from "./auxiliary-file.ts";
import type { Entity } from "./entity.ts";

export interface Paper extends Entity {
  internalReference: string;
  type: string;
  body: string;
  name: string;
  reference: string;
  date: string;
  paperType: string;
  auxiliaryFile: AuxiliaryFile[];
  underDirectionOf: string[];
  consultation: Consultation[];
  created: string;
  modified: string;
  deleted?: boolean;
}
