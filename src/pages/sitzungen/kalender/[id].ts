import type { APIRoute } from "astro";
import { createMeetingCalendar } from "../../../shared/meeting-calendar";
import { getMeetingCalendarStaticPaths } from "../../../shared/meeting-paths";
import { buildMeetingDetailUrl, getOParlEntityId } from "../../../shared/utils";
import type { Meeting } from "../../../shared/types";

export const getStaticPaths = getMeetingCalendarStaticPaths;

interface Props {
  meeting: Meeting;
}

export const GET: APIRoute<Props> = ({ props, site }) => {
  const { meeting } = props;
  const id = getOParlEntityId(meeting.id);
  const relativeMeetingUrl = buildMeetingDetailUrl(
    import.meta.env.BASE_URL,
    id,
  );
  const meetingUrl = site
    ? new URL(relativeMeetingUrl, site).href
    : relativeMeetingUrl;
  const calendar = createMeetingCalendar(meeting, meetingUrl);

  return new Response(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="sitzung-${id}.ics"`,
    },
  });
};
