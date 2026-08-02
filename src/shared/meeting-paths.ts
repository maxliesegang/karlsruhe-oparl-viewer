import { getMeetings } from "./data";
import { getOParlEntityId } from "./utils";
import type { Meeting } from "./types";

interface MeetingDetailStaticPath {
  params: { id: string };
  props: { meeting: Meeting };
}

let meetingPathsPromise: Promise<MeetingDetailStaticPath[]> | undefined;

export async function getMeetingStaticPaths(): Promise<
  MeetingDetailStaticPath[]
> {
  meetingPathsPromise ??= getMeetings().then((meetings) =>
    meetings.flatMap((meeting) => {
      const id = getOParlEntityId(meeting.id);
      return id ? [{ params: { id }, props: { meeting } }] : [];
    }),
  );
  return meetingPathsPromise;
}
