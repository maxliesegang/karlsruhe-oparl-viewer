import type { Paper } from "../types/paper.ts";
import { BaseStore } from "./base-store";
import { Singleton } from "../utils/singleton";

const dataUrl =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs/papers.json";

/**
 * Store for managing Paper entities.
 * Uses the Singleton pattern to ensure only one instance exists.
 */
export class PapersStoreBase extends BaseStore<Paper> {
  constructor() {
    super(dataUrl);
  }

  /**
   * Processes the fetched data by adding internalReference and storing in the data map.
   * @override
   */
  protected processData(data: Array<Paper>): void {
    // Add internalReference to each paper
    data.forEach((paper) => {
      paper.internalReference = paper.reference.replaceAll("/", "-");
    });

    // Filter and map papers using internalReference as the key
    this.data = new Map(
      data
        .filter(
          (paper) =>
            paper.reference !== "" &&
            paper.reference !== undefined &&
            paper.reference !== null,
        )
        .map((paper) => [paper.internalReference, paper]),
    );
  }

  /**
   * Gets the key to use for storing the paper in the data map.
   * For papers, we use internalReference instead of id.
   * @override
   */
  protected getItemKey(item: Paper): string {
    return item.internalReference;
  }

  /**
   * Gets a paper by its internal reference.
   * @param reference The internal reference of the paper to retrieve
   * @returns The paper with the specified reference, or undefined if not found
   */
  public async getPaperByInternalReference(
    reference: string,
  ): Promise<Paper | undefined> {
    return this.getById(reference);
  }

  /**
   * Gets all papers sorted by modification date (newest first).
   * @returns Array of all papers sorted by modification date
   * @override
   */
  public async getAllPapers(): Promise<Paper[]> {
    const papers = await this.getAll();
    return papers.sort((a, b) => {
      return new Date(b.modified).getTime() - new Date(a.modified).getTime();
    });
  }
}

export const PapersStore = Singleton(PapersStoreBase);
