import type { FileContentType } from "../types/file-content-type.ts";

const dataUrl =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs/file-contents.json";

export class FileContentStore {
  private static instance: FileContentStore | null = null;
  private fileContents: Map<string, FileContentType> = new Map();
  private readonly initialized: Promise<void>;

  private constructor() {
    this.initialized = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const response = await fetch(dataUrl);

      if (response.ok) {
        const result: Array<FileContentType> = await response.json();
        this.fileContents = new Map(
          result
            .filter(
              (meeting) =>
                meeting.id !== "" &&
                meeting.id !== undefined &&
                meeting.id !== null,
            )
            .map((meeting) => [meeting.id, meeting]),
        );
      } else {
        console.error(`Failed to fetch data. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching papers:", error);
    }
  }

  public async getFileContentById(
    id: string,
  ): Promise<FileContentType | undefined> {
    await this.initialized;
    return this.fileContents.get(id);
  }

  public static getInstance(): FileContentStore {
    if (!FileContentStore.instance) {
      FileContentStore.instance = new FileContentStore();
    }
    return FileContentStore.instance;
  }
}
