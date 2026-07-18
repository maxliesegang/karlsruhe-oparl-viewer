import type { AuxiliaryFile } from "./auxiliary-file.ts";
import type { FileContent } from "./file-content.ts";

export interface ResolvedAuxiliaryFile {
  file: AuxiliaryFile;
  content: FileContent | undefined;
}
