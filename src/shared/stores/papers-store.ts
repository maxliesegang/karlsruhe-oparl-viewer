import type { Paper } from "../types/paper.ts";
import { BaseStore } from "./base-store";

const dataUrl =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs/papers.json";

class PapersStore extends BaseStore<Paper> {
  constructor() {
    super(dataUrl);
  }

  protected processData(data: Array<Paper>): void {
    data.forEach((paper) => {
      paper.internalReference = paper.reference.replaceAll("/", "-");
    });
    super.processData(data);
  }

  protected getItemKey(item: Paper): string {
    return item.internalReference;
  }

  /** Returns all papers sorted by modification date (newest first). */
  public async getAllPapers(): Promise<Paper[]> {
    const papers = await this.getAll();
    return papers.sort(
      (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime(),
    );
  }
}

export const papersStore = new PapersStore();
