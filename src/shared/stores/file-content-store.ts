import type { FileContentType } from "../types/file-content-type.ts";
import { BaseStore } from "./base-store";
import { Singleton } from "../utils/singleton";

const baseUrl =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs";
const metadataUrl = `${baseUrl}/file-contents.json`;
const contentBasePath = `${baseUrl}/file-contents`;

/**
 * Store for managing FileContent entities.
 * Uses the Singleton pattern to ensure only one instance exists.
 * Supports lazy loading of text content.
 */
export class FileContentStoreBase extends BaseStore<FileContentType> {
  constructor() {
    super(metadataUrl);
  }

  /**
   * Gets a file content by its ID.
   * If the file has extractable text that hasn't been loaded yet, it will be fetched.
   * @param id The ID of the file content to retrieve
   * @returns The file content with the specified ID, or undefined if not found
   */
  public async getFileContentById(
    id: string,
  ): Promise<FileContentType | undefined> {
    await this.initialized;
    const fileContent = this.data.get(id);

    if (
      fileContent &&
      !fileContent.extractedText &&
      fileContent.hasExtractedText
    ) {
      await this.loadExtractedText(id, fileContent);
    }

    return fileContent;
  }

  /**
   * Loads the extracted text for a file content.
   * @param id The ID of the file content
   * @param fileContent The file content object to update
   */
  private async loadExtractedText(
    id: string,
    fileContent: FileContentType,
  ): Promise<void> {
    try {
      // Extract the last part of the ID to use as filename
      const idParts = id.split("/");
      const fileName = idParts[idParts.length - 1];
      const textFileUrl = `${contentBasePath}/${fileName}.txt`;

      const response = await fetch(textFileUrl);
      if (response.ok) {
        fileContent.extractedText = await response.text();
      } else {
        console.error(
          `Failed to fetch text content for ${id}. URL: ${textFileUrl} Status: ${response.status}`,
        );
      }
    } catch (error) {
      console.error(`Error fetching text content for ${id}:`, error);
    }
  }
}

export const FileContentStore = Singleton(FileContentStoreBase);
