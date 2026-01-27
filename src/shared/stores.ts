import type { Meeting } from "./types/meeting.ts";
import type { Organization } from "./types/organization.ts";
import { DATA_BASE_URL } from "./constants";
import { BaseStore } from "./stores/base-store";

export { papersStore } from "./stores/papers-store";
export { fileContentStore } from "./stores/file-content-store";

export const meetingsStore = new BaseStore<Meeting>(
  `${DATA_BASE_URL}/meetings.json`,
);

export const organizationsStore = new BaseStore<Organization>(
  `${DATA_BASE_URL}/organizations.json`,
);
