import type { Meeting } from "../types/meeting.ts";
import { BaseStore } from "./base-store";
import { Singleton } from "../utils/singleton";

const dataUrl =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs/meetings.json";

/**
 * Store for managing Meeting entities.
 * Uses the Singleton pattern to ensure only one instance exists.
 */
export class MeetingsStoreBase extends BaseStore<Meeting> {
  constructor() {
    super(dataUrl);
  }

  /**
   * Gets a meeting by its ID.
   * @param id The ID of the meeting to retrieve
   * @returns The meeting with the specified ID, or undefined if not found
   */
  public async getMeetingById(id: string): Promise<Meeting | undefined> {
    return this.getById(id);
  }
}

export const MeetingsStore = Singleton(MeetingsStoreBase);
