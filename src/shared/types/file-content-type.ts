export interface FileContentType {
  id: string;
  downloadUrl: string;
  fileModified: string;
  lastModifiedExtractedDate?: string;
  hasExtractedText?: boolean;
  extractedText?: string;
}
