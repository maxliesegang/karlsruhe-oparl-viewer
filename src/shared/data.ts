import { BULK_MODIFIED_DATE } from "./constants";
import { dataSource } from "./data-source";
import type {
  FileContentType,
  Meeting,
  Organization,
  Paper,
  ResolvedConsultation,
  ResolvedFile,
} from "./types";

// --- Caches ---
let papersCache: Paper[] | null = null;
let meetingsCache: Map<string, Meeting> | null = null;
let organizationsCache: Map<string, Organization> | null = null;
let fileContentsCache: Map<string, FileContentType> | null = null;
let paperStadtteileCache: Map<string, string[]> | null = null;
let availableYearsCache: string[] | null = null;
let availableStadtteileCache: string[] | null = null;
let stadtteilCountsCache: Map<string, number> | null = null;

function normalizeStringArray(
  value: string[] | string | null | undefined,
): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : [];

  return [...new Set(rawValues.map((entry) => entry.trim()).filter(Boolean))];
}

function buildStadtteilCountMap(papers: Paper[]): Map<string, number> {
  const stadtteilCounts = new Map<string, number>();

  for (const paper of papers) {
    for (const stadtteil of paper.stadtteile || []) {
      const trimmedStadtteil = stadtteil.trim();
      if (!trimmedStadtteil) continue;

      stadtteilCounts.set(
        trimmedStadtteil,
        (stadtteilCounts.get(trimmedStadtteil) ?? 0) + 1,
      );
    }
  }

  return stadtteilCounts;
}

// --- Loaders ---

export async function loadPapers(): Promise<Paper[]> {
  if (papersCache) return papersCache;

  const [data, paperStadtteile] = await Promise.all([
    dataSource.loadArray<Paper>("papers"),
    loadPaperStadtteile(),
  ]);
  const activePapers = data.filter((paper) => !paper.deleted);
  for (const paper of activePapers) {
    paper.internalReference = paper.reference.replaceAll("/", "-");
    paper.stadtteile = paperStadtteile.get(paper.reference) ?? [];
  }
  activePapers.sort(
    (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime(),
  );

  papersCache = activePapers;
  return papersCache;
}

export async function loadMeetings(): Promise<Map<string, Meeting>> {
  if (meetingsCache) return meetingsCache;

  const data = await dataSource.loadArray<Meeting>("meetings");
  meetingsCache = new Map(data.map((m) => [m.id, m]));
  return meetingsCache;
}

export async function loadOrganizations(): Promise<Map<string, Organization>> {
  if (organizationsCache) return organizationsCache;

  const data = await dataSource.loadArray<Organization>("organizations");
  organizationsCache = new Map(data.map((o) => [o.id, o]));
  return organizationsCache;
}

export async function loadFileContents(): Promise<
  Map<string, FileContentType>
> {
  if (fileContentsCache) return fileContentsCache;

  const metadata = await dataSource.loadArray<FileContentType>("file-contents");
  fileContentsCache = new Map(metadata.map((f) => [f.id, f]));

  const withText = metadata.filter((entry) => entry.hasExtractedText);
  let missingTextCount = 0;
  const workerCount = Math.min(64, withText.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < withText.length) {
        const entry = withText[nextIndex++];
        const fileId = new URL(entry.id).pathname
          .split("/")
          .filter(Boolean)
          .at(-1);
        if (!fileId) {
          missingTextCount++;
          continue;
        }
        const extractedText = await dataSource.loadText(fileId);
        if (extractedText === undefined) {
          missingTextCount++;
        } else {
          entry.extractedText = extractedText;
        }
      }
    }),
  );
  if (missingTextCount > 0) {
    console.warn(
      `Missing extracted text for ${missingTextCount} of ${withText.length} indexed files`,
    );
  }

  return fileContentsCache;
}

export async function loadPaperStadtteile(): Promise<Map<string, string[]>> {
  if (paperStadtteileCache) return paperStadtteileCache;

  const data = await dataSource.loadRecord<string[] | string | null>(
    "paper-stadtteile",
  );

  paperStadtteileCache = new Map(
    Object.entries(data).map(([reference, rawValue]) => [
      reference,
      normalizeStringArray(rawValue),
    ]),
  );

  return paperStadtteileCache;
}

// --- Derived data ---

export function getRelevantYear(paper: Paper): string {
  if (paper.modified.startsWith(BULK_MODIFIED_DATE)) {
    return paper.date.slice(0, 4);
  }
  return paper.modified.slice(0, 4);
}

export async function getAllAvailableYears(): Promise<string[]> {
  if (availableYearsCache) return availableYearsCache;

  const papers = await loadPapers();
  availableYearsCache = [
    ...new Set(papers.map((paper) => getRelevantYear(paper))),
  ].sort();
  return availableYearsCache;
}

export async function getAllAvailableStadtteile(): Promise<string[]> {
  if (availableStadtteileCache) return availableStadtteileCache;

  const stadtteilCounts = await getStadtteilCounts();
  availableStadtteileCache = [...stadtteilCounts.keys()].sort();
  return availableStadtteileCache;
}

export async function getStadtteilCounts(): Promise<Map<string, number>> {
  if (stadtteilCountsCache) return stadtteilCountsCache;

  const papers = await loadPapers();
  stadtteilCountsCache = buildStadtteilCountMap(papers);
  return stadtteilCountsCache;
}

// --- Per-paper resolvers ---

export async function resolveOrganizations(
  paper: Paper,
): Promise<Organization[]> {
  const orgsMap = await loadOrganizations();
  return (paper.underDirectionOf || [])
    .map((id) => orgsMap.get(id))
    .filter((o): o is Organization => o !== undefined);
}

export async function resolveConsultations(
  paper: Paper,
): Promise<ResolvedConsultation[]> {
  const meetingsMap = await loadMeetings();
  return (paper.consultation || []).map((consultation) => {
    const meeting = meetingsMap.get(consultation.meeting);
    const agendaItem = meeting?.agendaItem?.find(
      (item) => item.id === consultation.agendaItem,
    );
    return { consultation, meeting, agendaItem };
  });
}

export async function resolveFiles(paper: Paper): Promise<ResolvedFile[]> {
  const fileContentsMap = await loadFileContents();
  return (paper.auxiliaryFile || []).map((file) => ({
    file,
    content: fileContentsMap.get(file.id),
  }));
}
