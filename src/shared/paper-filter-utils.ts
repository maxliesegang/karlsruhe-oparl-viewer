import type {
  Meeting,
  Organization,
  Paper,
  PaperFilterData,
  PaperFilterOptions,
} from "./types";
import { getRelevantYear } from "./data";

export const FILTER_NO_VALUE = "Keine Angabe";
export const FILTER_NO_VALUES = "Keine Angaben";
type AgendaItemResultIndex = Map<string, Map<string, string>>;
const agendaItemResultIndexCache = new WeakMap<
  Map<string, Meeting>,
  AgendaItemResultIndex
>();

function normalizeValues(values: string[] = []): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function getOrganizationNames(
  paper: Paper,
  organizations: Map<string, Organization>,
): string {
  const orgNames = (paper.underDirectionOf || [])
    .map((id) => organizations.get(id)?.name)
    .filter((name): name is string => !!name);

  return orgNames.length > 0 ? orgNames.join(", ") : FILTER_NO_VALUES;
}

function getLastConsultationMeta(
  paper: Paper,
  agendaItemResultIndex: AgendaItemResultIndex,
): { lastRole: string; lastResult: string } {
  let lastRole = FILTER_NO_VALUE;
  let lastResult = FILTER_NO_VALUE;

  for (const consultation of paper.consultation || []) {
    if (consultation.role) {
      lastRole = consultation.role;
    }

    const result = agendaItemResultIndex
      .get(consultation.meeting)
      ?.get(consultation.agendaItem);
    if (result) {
      lastResult = result;
    }
  }

  return { lastRole, lastResult };
}

function buildAgendaItemResultIndex(
  meetings: Map<string, Meeting>,
): AgendaItemResultIndex {
  const agendaItemResultIndex: AgendaItemResultIndex = new Map();

  for (const [meetingId, meeting] of meetings.entries()) {
    if (!meeting.agendaItem?.length) continue;

    const agendaResults = new Map<string, string>();
    for (const agendaItem of meeting.agendaItem) {
      if (!agendaItem.result) continue;
      agendaResults.set(agendaItem.id, agendaItem.result);
    }

    if (agendaResults.size > 0) {
      agendaItemResultIndex.set(meetingId, agendaResults);
    }
  }

  return agendaItemResultIndex;
}

function getAgendaItemResultIndex(
  meetings: Map<string, Meeting>,
): AgendaItemResultIndex {
  const cachedIndex = agendaItemResultIndexCache.get(meetings);
  if (cachedIndex) return cachedIndex;

  const nextIndex = buildAgendaItemResultIndex(meetings);
  agendaItemResultIndexCache.set(meetings, nextIndex);
  return nextIndex;
}

function getStadtteileMeta(paper: Paper): {
  stadtteile: string[];
  stadtteileLabel: string;
  stadtteileFilterValue: string;
} {
  const stadtteile = normalizeValues(paper.stadtteile);
  const stadtteileLabel =
    stadtteile.length > 0 ? stadtteile.join(", ") : FILTER_NO_VALUES;

  return {
    stadtteile,
    stadtteileLabel,
    stadtteileFilterValue: stadtteile.join("|"),
  };
}

/** Build filter metadata and dropdown options for a list of papers. */
export function buildFilterData(
  papers: Paper[],
  organizations: Map<string, Organization>,
  meetings: Map<string, Meeting>,
): {
  filterData: Record<string, PaperFilterData>;
  filterOptions: PaperFilterOptions;
} {
  const filterData: Record<string, PaperFilterData> = {};
  const paperTypeSet = new Set<string>();
  const yearSet = new Set<string>();
  const organizationSet = new Set<string>();
  const roleSet = new Set<string>();
  const resultSet = new Set<string>();
  const stadtteilSet = new Set<string>();
  const agendaItemResultIndex = getAgendaItemResultIndex(meetings);

  for (const paper of papers) {
    const year = getRelevantYear(paper);
    const organizationNames = getOrganizationNames(paper, organizations);
    const { lastRole, lastResult } = getLastConsultationMeta(
      paper,
      agendaItemResultIndex,
    );
    const { stadtteile, stadtteileLabel, stadtteileFilterValue } =
      getStadtteileMeta(paper);

    filterData[paper.reference] = {
      year,
      organizationNames,
      lastRole,
      lastResult,
      stadtteileLabel,
      stadtteileFilterValue,
    };

    yearSet.add(year);
    if (paper.paperType) paperTypeSet.add(paper.paperType);
    organizationSet.add(organizationNames);
    if (lastRole) roleSet.add(lastRole);
    if (lastResult) resultSet.add(lastResult);
    for (const stadtteil of stadtteile) {
      stadtteilSet.add(stadtteil);
    }
  }

  const filterOptions: PaperFilterOptions = {
    years: [...yearSet].sort((a, b) => b.localeCompare(a)),
    paperTypes: [...paperTypeSet].sort(),
    organizations: [...organizationSet].sort(),
    roles: [...roleSet].sort(),
    results: [...resultSet].sort(),
    stadtteile: [...stadtteilSet].sort(),
  };

  return { filterData, filterOptions };
}
