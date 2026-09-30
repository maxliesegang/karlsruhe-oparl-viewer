import type { APIRoute } from "astro";
import {
  createMeetingCalendarFeed,
  selectCalendarFeedMeetings,
} from "../../shared/meeting-calendar";
import { getMeetings } from "../../shared/data";
import { buildMeetingDetailUrl, getOParlEntityId } from "../../shared/utils";

/**
 * Served inline rather than as an attachment so calendar apps can subscribe to
 * it. It is regenerated on every deploy, which is how subscribers stay current.
 */
export const GET: APIRoute = async ({ site }) => {
  const baseUrl = import.meta.env.BASE_URL;
  const meetings = selectCalendarFeedMeetings(await getMeetings()).flatMap(
    (meeting) => {
      const id = getOParlEntityId(meeting.id);
      if (!id) return [];
      const relativeMeetingUrl = buildMeetingDetailUrl(baseUrl, id);
      const meetingUrl = site
        ? new URL(relativeMeetingUrl, site).href
        : relativeMeetingUrl;
      return [{ meeting, meetingUrl }];
    },
  );

  return new Response(createMeetingCalendarFeed(meetings), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
};
