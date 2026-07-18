import type {
  Meeting,
  Organization,
  Paper,
  PaperFilterValues,
  PaperFilterOptions,
} from "./types";
import { getPaperYear } from "./data";

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

function getOrganizationLabel(
  paper: Paper,
  organizations: Map<string, Organization>,
): string {
  const orgNames = (paper.underDirectionOf || [])
    .map((id) => organizations.get(id)?.name)
    .filter((name): name is string => !!name);

  return orgNames.length > 0 ? orgNames.join(", ") : FILTER_NO_VALUES;
}

function getLatestConsultationValues(
  paper: Paper,
  agendaItemResultIndex: AgendaItemResultIndex,
): { role: string; result: string } {
  let role = FILTER_NO_VALUE;
  let result = FILTER_NO_VALUE;

  for (const consultation of paper.consultation || []) {
    if (consultation.role) {
      role = consultation.role;
    }

    const agendaItemResult = agendaItemResultIndex
      .get(consultation.meeting)
      ?.get(consultation.agendaItem);
    if (agendaItemResult) {
      result = agendaItemResult;
    }
  }

  return { role, result };
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

function getDistrictFilterValues(paper: Paper): {
  districtNames: string[];
  districtLabel: string;
  districts: string;
} {
  const districtNames = normalizeValues(paper.stadtteile);
  const districtLabel =
    districtNames.length > 0 ? districtNames.join(", ") : FILTER_NO_VALUES;

  return {
    districtNames,
    districtLabel,
    districts: districtNames.join("|"),
  };
}

/** Build per-paper filter values and dropdown options for a paper list. */
export function buildPaperFilterModel(
  papers: Paper[],
  organizations: Map<string, Organization>,
  meetings: Map<string, Meeting>,
): {
  valuesByReference: Record<string, PaperFilterValues>;
  options: PaperFilterOptions;
} {
  const valuesByReference: Record<string, PaperFilterValues> = {};
  const paperTypeSet = new Set<string>();
  const yearSet = new Set<string>();
  const organizationSet = new Set<string>();
  const roleSet = new Set<string>();
  const resultSet = new Set<string>();
  const districtSet = new Set<string>();
  const agendaItemResultIndex = getAgendaItemResultIndex(meetings);

  for (const paper of papers) {
    const year = getPaperYear(paper);
    const organization = getOrganizationLabel(paper, organizations);
    const { role: consultationRole, result: consultationResult } =
      getLatestConsultationValues(paper, agendaItemResultIndex);
    const { districtNames, districtLabel, districts } =
      getDistrictFilterValues(paper);

    valuesByReference[paper.reference] = {
      year,
      organization,
      consultationRole,
      consultationResult,
      districtLabel,
      districts,
    };

    yearSet.add(year);
    if (paper.paperType) paperTypeSet.add(paper.paperType);
    organizationSet.add(organization);
    if (consultationRole) roleSet.add(consultationRole);
    if (consultationResult) resultSet.add(consultationResult);
    for (const districtName of districtNames) {
      districtSet.add(districtName);
    }
  }

  const options: PaperFilterOptions = {
    years: [...yearSet].sort((a, b) => b.localeCompare(a)),
    paperTypes: [...paperTypeSet].sort(),
    organizations: [...organizationSet].sort(),
    roles: [...roleSet].sort(),
    results: [...resultSet].sort(),
    districts: [...districtSet].sort(),
  };

  return { valuesByReference, options };
}
