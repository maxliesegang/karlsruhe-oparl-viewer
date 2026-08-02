import type { Entity } from "./entity.ts";

/**
 * LLM-generated summary of a paper, produced by the syndication scraper.
 * Only a growing subset of papers has one — treat it as optional everywhere.
 */
export interface PaperSummary extends Entity {
  summary: string;
  keyPoints?: string[];
  generatedAt: string;
  model?: string;
  provider?: string;
  promptVersion?: string;
  sourceHash?: string;
}
