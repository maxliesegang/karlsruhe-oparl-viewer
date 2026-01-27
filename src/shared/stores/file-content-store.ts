import type { FileContentType } from "../types/file-content-type.ts";
import { DATA_BASE_URL } from "../constants";
import { BaseStore } from "./base-store";

const metadataUrl = `${DATA_BASE_URL}/file-contents.json`;
const chunksBasePath = `${DATA_BASE_URL}/file-contents-chunks`;

class FileContentStore extends BaseStore<FileContentType> {
  private chunksLoaded: boolean = false;

  constructor() {
    super(metadataUrl);
  }

  protected async initialize(): Promise<void> {
    await super.initialize();
    await this.loadContentFromChunks();
  }

  private async loadContentFromChunks(): Promise<void> {
    try {
      let chunkIndex = 0;

      while (true) {
        const chunkUrl = `${chunksBasePath}/chunk-${chunkIndex}.json`;
        const response = await fetch(chunkUrl);

        if (!response.ok) break;

        const chunkData: Array<{ id: string; extractedText: string }> =
          await response.json();

        for (const { id, extractedText } of chunkData) {
          const fileContent = this.data.get(id);
          if (fileContent?.hasExtractedText) {
            fileContent.extractedText = extractedText;
          }
        }

        chunkIndex++;
      }

      this.chunksLoaded = true;
    } catch (error) {
      console.error("Error loading content from chunks:", error);
      this.chunksLoaded = false;
    }
  }

  /** Ensures all chunk contents are loaded. No-op if already loaded. */
  public async preloadAllContents(): Promise<void> {
    await this.initialized;
    if (!this.chunksLoaded) {
      await this.loadContentFromChunks();
    }
  }
}

export const fileContentStore = new FileContentStore();
