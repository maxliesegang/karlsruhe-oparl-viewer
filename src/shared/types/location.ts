import type { Entity } from "./entity.ts";

export interface Location extends Entity {
  type: string;
  description: string;
  created: string;
  modified: string;
}
