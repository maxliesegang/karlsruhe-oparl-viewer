import type { Meeting } from "../types/meeting.ts";
import { BaseStore } from "./base-store";

const dataUrl =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs/meetings.json";

export const meetingsStore = new BaseStore<Meeting>(dataUrl);
