import {
  BULK_MODIFIED_DATE,
  CHUNK_BATCH_SIZE,
  DATA_BASE_URL,
} from "./constants";
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

// --- Generic fetcher ---
async function fetchJson<T>(url: string): Promise<T[]> {
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Failed to fetch ${url}: ${response.status}`);
    return [];
  }
  return response.json();
}

async function fetchJsonRecord<T>(
  url: string,
): Promise<Record<string, T | undefined>> {
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Failed to fetch ${url}: ${response.status}`);
    return {};
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    console.error(`Unexpected data shape for ${url}`);
    return {};
  }

  return data as Record<string, T | undefined>;
}

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

// --- Loaders ---

export async function loadPapers(): Promise<Paper[]> {
  if (papersCache) return papersCache;

  const [data, paperStadtteile] = await Promise.all([
    fetchJson<Paper>(`${DATA_BASE_URL}/papers.json`),
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

  const data = await fetchJson<Meeting>(`${DATA_BASE_URL}/meetings.json`);
  meetingsCache = new Map(data.map((m) => [m.id, m]));
  return meetingsCache;
}

export async function loadOrganizations(): Promise<Map<string, Organization>> {
  if (organizationsCache) return organizationsCache;

  const data = await fetchJson<Organization>(
    `${DATA_BASE_URL}/organizations.json`,
  );
  organizationsCache = new Map(data.map((o) => [o.id, o]));
  return organizationsCache;
}

export async function loadFileContents(): Promise<
  Map<string, FileContentType>
> {
  if (fileContentsCache) return fileContentsCache;

  const metadata = await fetchJson<FileContentType>(
    `${DATA_BASE_URL}/file-contents.json`,
  );
  fileContentsCache = new Map(metadata.map((f) => [f.id, f]));

  // Load chunks in parallel; non-existent chunks return null.
  const chunkPromises = Array.from({ length: CHUNK_BATCH_SIZE }, (_, i) =>
    fetch(`${DATA_BASE_URL}/file-contents-chunks/chunk-${i}.json`)
      .then((r) =>
        r.ok
          ? (r.json() as Promise<Array<{ id: string; extractedText: string }>>)
          : null,
      )
      .catch(() => null),
  );

  const chunks = await Promise.all(chunkPromises);
  for (const chunk of chunks) {
    if (!chunk) continue;
    for (const { id, extractedText } of chunk) {
      const entry = fileContentsCache.get(id);
      if (entry?.hasExtractedText) {
        entry.extractedText = extractedText;
      }
    }
  }

  return fileContentsCache;
}

export async function loadPaperStadtteile(): Promise<Map<string, string[]>> {
  if (paperStadtteileCache) return paperStadtteileCache;

  const data = await fetchJsonRecord<string[] | string | null>(
    `${DATA_BASE_URL}/paper-stadtteile.json`,
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
