import type { Organization } from "../types/organization.ts";
import { BaseStore } from "./base-store";

const dataUrl =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs/organizations.json";

export const organizationsStore = new BaseStore<Organization>(dataUrl);
