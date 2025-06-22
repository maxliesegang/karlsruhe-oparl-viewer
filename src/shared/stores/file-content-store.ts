import type { FileContentType } from "../types/file-content-type.ts";
import { BaseStore } from "./base-store";
import { Singleton } from "../utils/singleton";

const baseUrl =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs";
const metadataUrl = `${baseUrl}/file-contents.json`;
const contentBasePath = `${baseUrl}/file-contents`;
const chunksBasePath = `${baseUrl}/file-contents-chunks`;

/**
 * Store for managing FileContent entities.
 * Uses the Singleton pattern to ensure only one instance exists.
 * Supports lazy loading of text content.
 */
export class FileContentStoreBase extends BaseStore<FileContentType> {
  private chunksLoaded: boolean = false;

  constructor() {
    super(metadataUrl);
  }

  /**
   * Initializes the store by fetching metadata and then loading content from chunks.
   */
  protected async initialize(): Promise<void> {
    await super.initialize();
    await this.loadContentFromChunks();
  }

  /**
   * Loads content from chunk files to improve initial load performance.
   */
  private async loadContentFromChunks(): Promise<void> {
    try {
      // Start with chunk 0 and continue until a chunk is not found
      let chunkIndex = 0;
      let allChunksLoaded = false;

      while (!allChunksLoaded) {
        const chunkUrl = `${chunksBasePath}/chunk-${chunkIndex}.json`;
        const response = await fetch(chunkUrl);

        if (response.ok) {
          const chunkData = await response.json();

          // Process each file content in the chunk
          for (const [fileId, extractedText] of Object.entries(chunkData)) {
            const fileContent = this.data.get(fileId);
            if (fileContent && fileContent.hasExtractedText) {
              fileContent.extractedText = extractedText as string;
            }
          }

          chunkIndex++;
        } else {
          // No more chunks found
          allChunksLoaded = true;
        }
      }

      this.chunksLoaded = true;
    } catch (error) {
      console.error("Error loading content from chunks:", error);
      this.chunksLoaded = false;
    }
  }

  /**
   * Gets a file content by its ID.
   * The content should have been loaded from chunks during initialization.
   * @param id The ID of the file content to retrieve
   * @returns The file content with the specified ID, or undefined if not found
   */
  public async getFileContentById(
    id: string,
  ): Promise<FileContentType | undefined> {
    await this.initialized;
    return this.data.get(id);
  }

  /**
   * Preloads all file contents from chunks.
   * This can be called to ensure all contents are loaded before they are needed.
   * @returns A promise that resolves when all contents are loaded
   */
  public async preloadAllContents(): Promise<void> {
    await this.initialized;

    // If chunks were already loaded successfully, no need to do anything
    if (this.chunksLoaded) {
      return;
    }

    // Try to load content from chunks again
    await this.loadContentFromChunks();
  }
}

export const FileContentStore = Singleton(FileContentStoreBase);
