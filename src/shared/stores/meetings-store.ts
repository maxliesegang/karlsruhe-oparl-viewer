import type { Meeting } from "../types/meeting.ts";

const dataUrl =
  "https://raw.githubusercontent.com/maxliesegang/karlsruhe-oparl-syndication/refs/heads/main/docs/meetings.json";

export class MeetingsStore {
  private static instance: MeetingsStore | null = null;
  private meetings: Map<string, Meeting> = new Map();
  private initialized: Promise<void>;

  private constructor() {
    this.initialized = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const response = await fetch(dataUrl);

      if (response.ok) {
        const result: Array<Meeting> = await response.json();
        this.meetings = new Map(
          result
            .filter(
              (meeting) =>
                meeting.id !== "" &&
                meeting.id !== undefined &&
                meeting.id !== null,
            )
            .map((meeting) => [meeting.id, meeting]),
        );
      } else {
        console.error(`Failed to fetch data. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching papers:", error);
    }
  }

  public async getMeetingById(id: string): Promise<Meeting | undefined> {
    await this.initialized;
    return this.meetings.get(id);
  }

  public static getInstance(): MeetingsStore {
    if (!MeetingsStore.instance) {
      MeetingsStore.instance = new MeetingsStore();
    }
    return MeetingsStore.instance;
  }
}
