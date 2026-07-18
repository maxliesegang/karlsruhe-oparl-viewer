import { BULK_MODIFIED_DATE } from "./constants";
import { dataSource } from "./data-source";
import { mapConcurrent, memoizeAsync } from "./async-utils";
import type {
  FileContent,
  Meeting,
  Organization,
  Paper,
  ResolvedConsultation,
  ResolvedAuxiliaryFile,
} from "./types";

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

function buildPaperCountsByDistrict(papers: Paper[]): Map<string, number> {
  const paperCountsByDistrict = new Map<string, number>();

  for (const paper of papers) {
    for (const districtName of paper.stadtteile) {
      const normalizedDistrictName = districtName.trim();
      if (!normalizedDistrictName) continue;

      paperCountsByDistrict.set(
        normalizedDistrictName,
        (paperCountsByDistrict.get(normalizedDistrictName) ?? 0) + 1,
      );
    }
  }

  return paperCountsByDistrict;
}

// --- Loaders ---

export const loadPapers = memoizeAsync(async (): Promise<Paper[]> => {
  const [papers, districtsByPaperReference] = await Promise.all([
    dataSource.loadArray<Paper>("papers"),
    loadPaperDistricts(),
  ]);
  const activePapers = papers
    .filter((paper) => !paper.deleted)
    .map((paper) => ({
      ...paper,
      routeReference: paper.reference.replaceAll("/", "-"),
      stadtteile: districtsByPaperReference.get(paper.reference) ?? [],
    }))
    .sort((a, b) => b.modified.localeCompare(a.modified));

  return activePapers;
});

export const loadMeetings = memoizeAsync(
  async (): Promise<Map<string, Meeting>> => {
    const meetings = await dataSource.loadArray<Meeting>("meetings");
    return new Map(meetings.map((meeting) => [meeting.id, meeting]));
  },
);

export const loadOrganizations = memoizeAsync(
  async (): Promise<Map<string, Organization>> => {
    const organizations =
      await dataSource.loadArray<Organization>("organizations");
    return new Map(
      organizations.map((organization) => [organization.id, organization]),
    );
  },
);

export const loadFileContents = memoizeAsync(
  async (): Promise<Map<string, FileContent>> => {
    const fileContents =
      await dataSource.loadArray<FileContent>("file-contents");
    const fileContentsById = new Map(
      fileContents.map((fileContent) => [fileContent.id, fileContent]),
    );

    const filesWithExtractedText = fileContents.filter(
      (fileContent) => fileContent.hasExtractedText,
    );
    let missingTextCount = 0;
    await mapConcurrent(filesWithExtractedText, 64, async (fileContent) => {
      const fileId = new URL(fileContent.id).pathname
        .split("/")
        .filter(Boolean)
        .at(-1);
      if (!fileId) {
        missingTextCount++;
        return;
      }
      const extractedText = await dataSource.loadText(fileId);
      if (extractedText === undefined) {
        missingTextCount++;
      } else {
        fileContent.extractedText = extractedText;
      }
    });
    if (missingTextCount > 0) {
      console.warn(
        `Missing extracted text for ${missingTextCount} of ${filesWithExtractedText.length} indexed files`,
      );
    }

    return fileContentsById;
  },
);

export const loadPaperDistricts = memoizeAsync(
  async (): Promise<Map<string, string[]>> => {
    const districtsByReference = await dataSource.loadRecord<
      string[] | string | null
    >("paper-stadtteile");

    return new Map(
      Object.entries(districtsByReference).map(([reference, rawValue]) => [
        reference,
        normalizeStringArray(rawValue),
      ]),
    );
  },
);

// --- Derived data ---

export function getPaperYear(paper: Paper): string {
  if (paper.modified.startsWith(BULK_MODIFIED_DATE)) {
    return paper.date.slice(0, 4);
  }
  return paper.modified.slice(0, 4);
}

export const getAvailableYears = memoizeAsync(async (): Promise<string[]> => {
  const papers = await loadPapers();
  return [...new Set(papers.map((paper) => getPaperYear(paper)))].sort();
});

export const getAvailableDistricts = memoizeAsync(
  async (): Promise<string[]> => {
    const paperCountsByDistrict = await getPaperCountsByDistrict();
    return [...paperCountsByDistrict.keys()].sort();
  },
);

export const getPaperCountsByDistrict = memoizeAsync(
  async (): Promise<Map<string, number>> => {
    const papers = await loadPapers();
    return buildPaperCountsByDistrict(papers);
  },
);

// --- Per-paper resolvers ---

export async function resolveOrganizations(
  paper: Paper,
): Promise<Organization[]> {
  const organizationsById = await loadOrganizations();
  return (paper.underDirectionOf || [])
    .map((organizationId) => organizationsById.get(organizationId))
    .filter(
      (organization): organization is Organization =>
        organization !== undefined,
    );
}

export async function resolveConsultations(
  paper: Paper,
): Promise<ResolvedConsultation[]> {
  const meetingsById = await loadMeetings();
  return (paper.consultation || []).map((consultation) => {
    const meeting = meetingsById.get(consultation.meeting);
    const agendaItem = meeting?.agendaItem?.find(
      (item) => item.id === consultation.agendaItem,
    );
    return { consultation, meeting, agendaItem };
  });
}

export async function resolveAuxiliaryFiles(
  paper: Paper,
): Promise<ResolvedAuxiliaryFile[]> {
  const fileContentsById = await loadFileContents();
  return (paper.auxiliaryFile || []).map((auxiliaryFile) => ({
    file: auxiliaryFile,
    content: fileContentsById.get(auxiliaryFile.id),
  }));
}
