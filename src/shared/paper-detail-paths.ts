import { loadPapers } from "./data";
import type { Paper } from "./types";

interface PaperDetailStaticPath {
  params: { reference: string };
  props: { paper: Paper };
}

interface PaperReferenceStaticPath {
  params: { reference: string };
}

let staticPathCache: {
  detailPaths: PaperDetailStaticPath[];
  referencePaths: PaperReferenceStaticPath[];
} | null = null;

async function getStaticPathCache() {
  if (staticPathCache) return staticPathCache;

  const papers = await loadPapers();
  const detailPaths: PaperDetailStaticPath[] = [];
  const referencePaths: PaperReferenceStaticPath[] = [];

  for (const paper of papers) {
    const reference = paper.internalReference;
    detailPaths.push({
      params: { reference },
      props: { paper },
    });
    referencePaths.push({
      params: { reference },
    });
  }

  staticPathCache = { detailPaths, referencePaths };
  return staticPathCache;
}

export async function getPaperDetailStaticPaths(): Promise<
  PaperDetailStaticPath[]
> {
  return (await getStaticPathCache()).detailPaths;
}

export async function getPaperReferenceStaticPaths(): Promise<
  PaperReferenceStaticPath[]
> {
  return (await getStaticPathCache()).referencePaths;
}
