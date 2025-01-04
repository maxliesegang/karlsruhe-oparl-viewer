import type { Organization } from "../types/organization.ts";

const dataUrl =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs/organizations.json";

export class OrganizationsStore {
  private static instance: OrganizationsStore | null = null;
  private organizations: Map<string, Organization> = new Map();
  private readonly initialized: Promise<void>;

  private constructor() {
    this.initialized = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const response = await fetch(dataUrl);

      if (response.ok) {
        const result: Array<Organization> = await response.json();
        this.organizations = new Map(
          result
            .filter(
              (organization) =>
                organization.id !== "" &&
                organization.id !== undefined &&
                organization.id !== null,
            )
            .map((organization) => [organization.id, organization]),
        );
      } else {
        console.error(`Failed to fetch data. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching papers:", error);
    }
  }

  public async getOrganizationById(
    id: string,
  ): Promise<Organization | undefined> {
    await this.initialized;
    return this.organizations.get(id);
  }

  public static getInstance(): OrganizationsStore {
    if (!OrganizationsStore.instance) {
      OrganizationsStore.instance = new OrganizationsStore();
    }
    return OrganizationsStore.instance;
  }
}
