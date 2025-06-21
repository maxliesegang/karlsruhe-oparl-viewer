import type { FileContentType } from "../types/file-content-type.ts";

const baseUrl =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs";
const metadataUrl = `${baseUrl}/file-contents.json`;
const contentBasePath = `${baseUrl}/file-contents`;

export class FileContentStore {
  private static instance: FileContentStore | null = null;
  private fileContents: Map<string, FileContentType> = new Map();
  private readonly initialized: Promise<void>;

  private constructor() {
    this.initialized = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const response = await fetch(metadataUrl);

      if (response.ok) {
        const result: Array<FileContentType> = await response.json();
        this.fileContents = new Map(
          result
            .filter(
              (fileContent) =>
                fileContent.id !== "" &&
                fileContent.id !== undefined &&
                fileContent.id !== null,
            )
            .map((fileContent) => [fileContent.id, fileContent]),
        );
      } else {
        console.error(`Failed to fetch data. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching file contents:", error);
    }
  }

  public async getFileContentById(
    id: string,
  ): Promise<FileContentType | undefined> {
    await this.initialized;
    const fileContent = this.fileContents.get(id);

    if (fileContent && !fileContent.extractedText) {
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
            `Failed to fetch text content for ${id}. Status: ${response.status}`,
          );
        }
      } catch (error) {
        console.error(`Error fetching text content for ${id}:`, error);
      }
    }

    return fileContent;
  }

  public static getInstance(): FileContentStore {
    if (!FileContentStore.instance) {
      FileContentStore.instance = new FileContentStore();
    }
    return FileContentStore.instance;
  }
}
