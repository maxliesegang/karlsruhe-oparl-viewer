import type { AuxiliaryFile } from "./auxiliary-file.ts";
import type { FileContentType } from "./file-content-type.ts";

export interface ResolvedFile {
  file: AuxiliaryFile;
  content: FileContentType | undefined;
}
