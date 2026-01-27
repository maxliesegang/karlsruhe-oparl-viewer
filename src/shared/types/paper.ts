import type { Consultation } from "./consultation.ts";
import type { AuxiliaryFile } from "./auxiliary-file.ts";

export interface Paper {
  id: string;
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
}
