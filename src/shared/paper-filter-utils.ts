import type {
  Meeting,
  Organization,
  Paper,
  PaperFilterData,
  PaperFilterOptions,
} from "./types";

const NO_VALUE = "Keine Angabe";
const NO_VALUES = "Keine Angaben";

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

  return orgNames.length > 0 ? orgNames.join(", ") : NO_VALUES;
}

function getLastConsultationMeta(
  paper: Paper,
  meetings: Map<string, Meeting>,
): { lastRole: string; lastResult: string } {
  let lastRole = NO_VALUE;
  let lastResult = NO_VALUE;

  for (const consultation of paper.consultation || []) {
    if (consultation.role) {
      lastRole = consultation.role;
    }

    const meeting = meetings.get(consultation.meeting);
    const agendaItem = meeting?.agendaItem?.find(
      (item) => item.id === consultation.agendaItem,
    );
    if (agendaItem?.result) {
      lastResult = agendaItem.result;
    }
  }

  return { lastRole, lastResult };
}

function getStadtteileMeta(paper: Paper): {
  stadtteile: string[];
  stadtteileLabel: string;
  stadtteileFilterValue: string;
} {
  const stadtteile = normalizeValues(paper.stadtteile);
  const stadtteileLabel =
    stadtteile.length > 0 ? stadtteile.join(", ") : NO_VALUES;

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
  const organizationSet = new Set<string>();
  const roleSet = new Set<string>();
  const resultSet = new Set<string>();
  const stadtteilSet = new Set<string>();

  for (const paper of papers) {
    const organizationNames = getOrganizationNames(paper, organizations);
    const { lastRole, lastResult } = getLastConsultationMeta(paper, meetings);
    const { stadtteile, stadtteileLabel, stadtteileFilterValue } =
      getStadtteileMeta(paper);

    filterData[paper.reference] = {
      organizationNames,
      lastRole,
      lastResult,
      stadtteileLabel,
      stadtteileFilterValue,
    };

    if (paper.paperType) paperTypeSet.add(paper.paperType);
    organizationSet.add(organizationNames);
    if (lastRole) roleSet.add(lastRole);
    if (lastResult) resultSet.add(lastResult);
    for (const stadtteil of stadtteile) {
      stadtteilSet.add(stadtteil);
    }
  }

  const filterOptions: PaperFilterOptions = {
    paperTypes: [...paperTypeSet].sort(),
    organizations: [...organizationSet].sort(),
    roles: [...roleSet].sort(),
    results: [...resultSet].sort(),
    stadtteile: [...stadtteilSet].sort(),
  };

  return { filterData, filterOptions };
}
