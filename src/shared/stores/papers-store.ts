import type { Paper } from "../types/paper.ts";

const dataUrl =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs/papers.json";

export class PapersStore {
  private static instance: PapersStore | null = null;
  private papers: Map<string, Paper> = new Map();
  private initialized: Promise<void>;

  private constructor() {
    this.initialized = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const response = await fetch(dataUrl);

      if (response.ok) {
        const result: Array<Paper> = await response.json();
        result.forEach((paper) => {
          paper.internalReference = paper.reference.replaceAll("/", "-");
        });
        this.papers = new Map(
          result
            .filter(
              (paper) =>
                paper.reference !== "" &&
                paper.reference !== undefined &&
                paper.reference !== null,
            )

            .map((paper) => [paper.internalReference, paper]),
        );
      } else {
        console.error(`Failed to fetch data. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching papers:", error);
    }
  }

  public async getPaperByInternalReference(
    reference: string,
  ): Promise<Paper | undefined> {
    await this.initialized;
    return this.papers.get(reference);
  }

  public async getAllPapers(): Promise<Paper[]> {
    await this.initialized;
    return Array.from(this.papers.values()).sort((a, b) => {
      return new Date(b.modified).getTime() - new Date(a.modified).getTime();
    });
  }

  public static getInstance(): PapersStore {
    if (!PapersStore.instance) {
      PapersStore.instance = new PapersStore();
    }
    return PapersStore.instance;
  }
}
