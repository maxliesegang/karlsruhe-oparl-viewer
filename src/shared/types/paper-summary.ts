import type { Entity } from "./entity.ts";

/**
 * LLM-generated summary of a paper, produced by the syndication scraper.
 * Only a growing subset of papers has one — treat it as optional everywhere.
 */
export interface PaperSummary extends Entity {
  summary: string;
  keyPoints?: string[];
  /**
   * Where each key point comes from, index-aligned with `keyPoints`; `null` where
   * the scraper found no source. Written from prompt `paper-de-v9` on, absent
   * before. The scraper locates the model's verbatim quote in the attachments
   * itself, so `file` and `page` are never model guesses.
   */
  keyPointSources?: (PaperSummaryKeyPointSource | null)[];
  generatedAt: string;
  model?: string;
  provider?: string;
  promptVersion?: string;
  sourceHash?: string;
}

/** The attachment passage a summary key point rests on. */
export interface PaperSummaryKeyPointSource {
  /** OParl `File` id, matching one of the paper's `auxiliaryFile` entries. */
  file: string;
  /** 1-based PDF page; absent when the extracted text had no page markers. */
  page?: number;
  /** The located passage as it reads in the attachment. */
  quote: string;
}
