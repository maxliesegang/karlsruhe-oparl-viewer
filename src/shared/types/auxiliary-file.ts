import type { Entity } from "./entity.ts";

export interface AuxiliaryFile extends Entity {
  type: string;
  name: string;
  fileName: string;
  mimeType: string;
  date: string;
  accessUrl: string;
  downloadUrl: string;
  created: string;
  modified: string;
}
