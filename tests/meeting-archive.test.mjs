import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMeetingArchiveYears,
  buildMeetingArchiveYearUrl,
  buildMeetingMonthOptions,
  filterMeetingsByYear,
  getMeetingMonth,
  getMeetingMonthLabel,
  getMeetingYear,
  hasMeetingProtocol,
} from "../src/shared/meeting-archive.ts";

/** Local noon keeps the assertions free of timezone drift. */
function meeting(id, start, extra = {}) {
  return { id, name: `Sitzung ${id}`, start, end: "", ...extra };
}

test("year and month come from the meeting start", () => {
  assert.equal(getMeetingYear("2024-03-07T12:00:00"), "2024");
  assert.equal(getMeetingMonth("2024-03-07T12:00:00"), "03");
  assert.equal(getMeetingYear(undefined), "");
  assert.equal(getMeetingMonth("keine-zahl"), "");
});

test("month labels are German", () => {
  assert.equal(getMeetingMonthLabel("01"), "Januar");
  assert.equal(getMeetingMonthLabel("12"), "Dezember");
  assert.equal(getMeetingMonthLabel("13"), "");
});

test("archive years are counted and sorted newest first", () => {
  const years = buildMeetingArchiveYears([
    meeting("a", "2023-05-02T12:00:00"),
    meeting("b", "2024-01-02T12:00:00"),
    meeting("c", "2024-11-02T12:00:00"),
    meeting("d", "kein-datum"),
  ]);

  assert.deepEqual(years, [
    { year: "2024", count: 2 },
    { year: "2023", count: 1 },
  ]);
});

test("filtering by year keeps only that year's meetings", () => {
  const meetings = [
    meeting("a", "2023-12-31T12:00:00"),
    meeting("b", "2024-01-01T12:00:00"),
  ];

  assert.deepEqual(
    filterMeetingsByYear(meetings, "2024").map((entry) => entry.id),
    ["b"],
  );
});

test("month options list only the months present, in calendar order", () => {
  const options = buildMeetingMonthOptions([
    meeting("a", "2024-11-02T12:00:00"),
    meeting("b", "2024-02-02T12:00:00"),
    meeting("c", "2024-02-20T12:00:00"),
    meeting("d", "kein-datum"),
  ]);

  assert.deepEqual(options, [
    { value: "02", label: "Februar" },
    { value: "11", label: "November" },
  ]);
});

test("a protocol of either kind counts", () => {
  assert.equal(hasMeetingProtocol(meeting("a", "2024-01-01T12:00:00")), false);
  assert.equal(
    hasMeetingProtocol(
      meeting("b", "2024-01-01T12:00:00", { resultsProtocol: { id: "f1" } }),
    ),
    true,
  );
  assert.equal(
    hasMeetingProtocol(
      meeting("c", "2024-01-01T12:00:00", { verbatimProtocol: { id: "f2" } }),
    ),
    true,
  );
});

test("archive year URLs keep the base prefix", () => {
  assert.equal(
    buildMeetingArchiveYearUrl("/karlsruhe-oparl-viewer/", "2024"),
    "/karlsruhe-oparl-viewer/sitzungen/archiv/2024",
  );
});
