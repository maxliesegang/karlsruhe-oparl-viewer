import assert from "node:assert/strict";
import test from "node:test";
import {
  createMeetingCalendar,
  createMeetingCalendarFeed,
  selectCalendarFeedMeetings,
} from "../src/shared/meeting-calendar.ts";

const BODY = "https://web2.karlsruhe.de/ris/oparl/bodies/0001/meetings";

function meeting(id, start, end, extra = {}) {
  return {
    id: `${BODY}/${id}`,
    type: "https://schema.oparl.org/1.1/Meeting",
    name: `Sitzung ${id}`,
    start,
    end,
    created: "2026-01-01T10:00:00+01:00",
    modified: "2026-01-02T10:00:00+01:00",
    ...extra,
  };
}

const url = (id) => `https://example.org/sitzungen/${id}`;

test("the single download keeps its exact shape", () => {
  const calendar = createMeetingCalendar(
    meeting("42", "2026-10-05T17:00:00+02:00", "2026-10-05T19:00:00+02:00", {
      location: { description: "Rathaus, Bürgersaal" },
    }),
    url("42"),
  );

  assert.equal(
    calendar,
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//GemeinderatsRadar Karlsruhe//Sitzungstermin//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:sitzung-42@gemeinderatsradar.karlsruhe",
      "DTSTAMP:20260102T090000Z",
      "DTSTART:20261005T150000Z",
      "DTEND:20261005T170000Z",
      "SUMMARY:Sitzung 42",
      "LOCATION:Rathaus\\, Bürgersaal",
      "DESCRIPTION:Öffentliche Sitzung. Details und Tagesordnung: https://example",
      " .org/sitzungen/42",
      "URL:https://example.org/sitzungen/42",
      "CREATED:20260101T090000Z",
      "LAST-MODIFIED:20260102T090000Z",
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n"),
  );
});

test("the feed holds one event per meeting under a named calendar", () => {
  const feed = createMeetingCalendarFeed(
    ["1", "2"].map((id) => ({
      meeting: meeting(id, "2026-10-05T17:00:00+02:00", ""),
      meetingUrl: url(id),
    })),
  );

  assert.equal(feed.match(/^BEGIN:VCALENDAR\r$/gm)?.length, 1);
  assert.equal(feed.match(/^BEGIN:VEVENT\r$/gm)?.length, 2);
  assert.match(feed, /^UID:sitzung-1@gemeinderatsradar\.karlsruhe\r$/m);
  assert.match(feed, /^UID:sitzung-2@gemeinderatsradar\.karlsruhe\r$/m);
  assert.match(feed, /^X-WR-CALNAME:Sitzungen Karlsruhe/m);
  assert.match(feed, /^REFRESH-INTERVAL;VALUE=DURATION:PT12H\r$/m);
  assert.ok(feed.endsWith("END:VCALENDAR\r\n"));
  assert.ok(!/[^\r]\n/.test(feed), "every line ends in CRLF");
});

test("an empty feed is still a valid calendar", () => {
  const feed = createMeetingCalendarFeed([]);

  assert.match(feed, /^BEGIN:VCALENDAR\r\n/);
  assert.ok(!feed.includes("BEGIN:VEVENT"));
});

test("feed lines stay within 75 octets", () => {
  const feed = createMeetingCalendarFeed([
    {
      meeting: meeting("7", "2026-10-05T17:00:00+02:00", "", {
        name: "Ausschuss für Umwelt, Klimaschutz und Grünflächen; ".repeat(4),
      }),
      meetingUrl: url("7"),
    },
  ]);

  for (const line of feed.split("\r\n")) {
    assert.ok(Buffer.byteLength(line) <= 75, line);
  }
});

test("the feed keeps upcoming meetings and the last 30 days", () => {
  const now = new Date("2026-09-30T12:00:00Z");
  const meetings = [
    meeting("old", "2026-08-01T17:00:00+02:00", "2026-08-01T19:00:00+02:00"),
    meeting("recent", "2026-09-10T17:00:00+02:00", "2026-09-10T19:00:00+02:00"),
    meeting("next", "2026-10-05T17:00:00+02:00", ""),
  ];

  const selected = selectCalendarFeedMeetings(meetings, now);

  assert.deepEqual(
    selected.map((m) => m.name),
    ["Sitzung recent", "Sitzung next"],
  );
});
