import type { Organization } from "../types/organization.ts";
import { BaseStore } from "./base-store";
import { Singleton } from "../utils/singleton";

const dataUrl =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs/organizations.json";

/**
 * Store for managing Organization entities.
 * Uses the Singleton pattern to ensure only one instance exists.
 */
export class OrganizationsStoreBase extends BaseStore<Organization> {
  constructor() {
    super(dataUrl);
  }

  /**
   * Gets an organization by its ID.
   * @param id The ID of the organization to retrieve
   * @returns The organization with the specified ID, or undefined if not found
   */
  public async getOrganizationById(
    id: string,
  ): Promise<Organization | undefined> {
    return this.getById(id);
  }
}

export const OrganizationsStore = Singleton(OrganizationsStoreBase);
