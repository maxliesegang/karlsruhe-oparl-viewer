import { getMeetings } from "./data";
import { getOParlEntityId } from "./utils";
import type { Meeting } from "./types";

interface MeetingStaticPath {
  params: { id: string };
  props: { meeting: Meeting };
}

let meetingPathsPromise: Promise<MeetingStaticPath[]> | undefined;

export async function getMeetingStaticPaths(): Promise<MeetingStaticPath[]> {
  meetingPathsPromise ??= getMeetings().then((meetings) =>
    meetings.flatMap((meeting) => {
      const id = getOParlEntityId(meeting.id);
      return id ? [{ params: { id }, props: { meeting } }] : [];
    }),
  );
  return meetingPathsPromise;
}

/** The `.ics` suffix is part of the dynamic parameter for the API route. */
export async function getMeetingCalendarStaticPaths(): Promise<
  MeetingStaticPath[]
> {
  const meetingPaths = await getMeetingStaticPaths();
  return meetingPaths.map((path) => ({
    ...path,
    params: { id: `${path.params.id}.ics` },
  }));
}
