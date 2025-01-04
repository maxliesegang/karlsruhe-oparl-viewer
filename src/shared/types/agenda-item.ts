import type { AuxiliaryFile } from "./auxiliary-file.ts";

export interface AgendaItem {
  id: string;
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
