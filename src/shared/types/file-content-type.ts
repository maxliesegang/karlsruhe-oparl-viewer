import type { Entity } from "./entity.ts";

export interface FileContentType extends Entity {
  downloadUrl: string;
  fileModified: string;
  lastModifiedExtractedDate?: string;
  hasExtractedText?: boolean;
  extractedText?: string;
}
