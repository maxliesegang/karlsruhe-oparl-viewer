import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMeetingDigestUrl,
  formatMeetingDigestLeads,
  getMeetingDigestRecordId,
  parseMeetingDigestLeads,
  selectMeetingDigestLeads,
} from "../src/shared/meeting-digest.ts";

test("an upcoming sitting tries every lead time, freshest first", () => {
  assert.deepEqual(
    selectMeetingDigestLeads({ knownLeads: [], isUpcoming: true }),
    ["day", "week"],
  );
  assert.deepEqual(
    selectMeetingDigestLeads({ knownLeads: ["week"], isUpcoming: true }),
    ["day", "week"],
  );
});

test("a past sitting tries only the leads the build saw", () => {
  assert.deepEqual(
    selectMeetingDigestLeads({ knownLeads: ["week"], isUpcoming: false }),
    ["week"],
  );
  assert.deepEqual(
    selectMeetingDigestLeads({
      knownLeads: ["week", "day"],
      isUpcoming: false,
    }),
    ["day", "week"],
  );
  assert.deepEqual(
    selectMeetingDigestLeads({ knownLeads: [], isUpcoming: false }),
    [],
  );
});

test("leads survive the round trip through the data attribute", () => {
  const leads = ["day", "week"];
  assert.equal(formatMeetingDigestLeads(leads), "day,week");
  assert.deepEqual(parseMeetingDigestLeads("day,week"), leads);
  assert.deepEqual(parseMeetingDigestLeads(" day , week "), leads);
});

test("unknown or missing leads are dropped rather than fetched", () => {
  assert.deepEqual(parseMeetingDigestLeads("month,day"), ["day"]);
  assert.deepEqual(parseMeetingDigestLeads(undefined), []);
  assert.deepEqual(parseMeetingDigestLeads(""), []);
});

test("the record id and URL match the mirror's layout", () => {
  assert.equal(getMeetingDigestRecordId("10731", "day"), "10731-day");
  assert.equal(
    buildMeetingDigestUrl("10731", "day"),
    "https://maxliesegang.github.io/karlsruhe-oparl-syndication/digests/meetings/10731-day.json",
  );
});
