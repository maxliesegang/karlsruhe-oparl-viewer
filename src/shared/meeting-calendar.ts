import { getEffectiveMeetingEnd, getOParlEntityId } from "./utils";
import type { Meeting } from "./types";

const encoder = new TextEncoder();

function escapeCalendarText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** RFC 5545 content lines may contain at most 75 UTF-8 octets. */
function foldContentLine(line: string): string {
  const parts: string[] = [];
  let part = "";
  let byteLength = 0;
  let byteLimit = 75;

  for (const character of line) {
    const characterByteLength = encoder.encode(character).length;
    if (part && byteLength + characterByteLength > byteLimit) {
      parts.push(part);
      part = "";
      byteLength = 0;
      // Continuation lines start with one whitespace octet.
      byteLimit = 74;
    }
    part += character;
    byteLength += characterByteLength;
  }

  parts.push(part);
  return parts.join("\r\n ");
}

function formatCalendarDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid calendar date: ${String(value)}`);
  }
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function createMeetingCalendar(
  meeting: Meeting,
  meetingUrl: string,
): string {
  const meetingId = getOParlEntityId(meeting.id);
  if (!meetingId) {
    throw new TypeError(`Meeting has no stable id: ${meeting.id}`);
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GemeinderatsRadar Karlsruhe//Sitzungstermin//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:sitzung-${meetingId}@gemeinderatsradar.karlsruhe`,
    `DTSTAMP:${formatCalendarDate(meeting.modified)}`,
    `DTSTART:${formatCalendarDate(meeting.start)}`,
    `DTEND:${formatCalendarDate(
      getEffectiveMeetingEnd(meeting.start, meeting.end),
    )}`,
    `SUMMARY:${escapeCalendarText(meeting.name)}`,
    meeting.location?.description
      ? `LOCATION:${escapeCalendarText(meeting.location.description)}`
      : undefined,
    `DESCRIPTION:${escapeCalendarText(
      `Öffentliche Sitzung. Details und Tagesordnung: ${meetingUrl}`,
    )}`,
    `URL:${meetingUrl}`,
    `CREATED:${formatCalendarDate(meeting.created)}`,
    `LAST-MODIFIED:${formatCalendarDate(meeting.modified)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => Boolean(line));

  return `${lines.map(foldContentLine).join("\r\n")}\r\n`;
}
