import type { Entity } from "./entity.ts";

export interface Organization extends Entity {
  type: string;
  body: string;
  name: string;
  shortName: string;
  startDate: string;
  created: string;
  modified: string;
}
