import test from "node:test";
import assert from "node:assert/strict";
import {
  buildKeyPointSourceLinks,
  getConsultationRoleLabel,
  getMeaningfulModified,
  getPaperTimelineStart,
  isBulkImportTimestamp,
} from "../src/shared/paper-presentation.ts";

test("the bulk import stamp is recognised", () => {
  assert.equal(isBulkImportTimestamp("2025-03-03T13:33:42+01:00"), true);
  assert.equal(isBulkImportTimestamp("2025-03-04T09:00:00+01:00"), false);
  assert.equal(isBulkImportTimestamp(undefined), false);
});

test("placeholder and repeated roles are not printed", () => {
  assert.equal(getConsultationRoleLabel("unbekannt", ""), "");
  assert.equal(getConsultationRoleLabel(" Unbekannt ", ""), "");
  assert.equal(getConsultationRoleLabel("Kenntnisnahme", "Kenntnisnahme"), "");
  assert.equal(
    getConsultationRoleLabel("Vorberatung", "vertagt"),
    "Vorberatung",
  );
  assert.equal(getConsultationRoleLabel(undefined, ""), "");
});

test("a migrated paper starts at its own date, not the migration day", () => {
  const migrated = {
    created: "2016-10-12T10:08:00+02:00",
    date: "2006-04-18",
  };
  assert.deepEqual(
    getPaperTimelineStart(migrated, "2006-05-09T16:30:00+02:00"),
    { value: "2006-04-18", precise: false },
  );
});

test("a current paper keeps its publication timestamp", () => {
  const paper = { created: "2026-09-01T10:00:00+02:00", date: "2026-09-01" };
  assert.deepEqual(getPaperTimelineStart(paper, "2026-10-20T16:00:00+02:00"), {
    value: paper.created,
    precise: true,
  });
  assert.deepEqual(getPaperTimelineStart(paper, undefined), {
    value: paper.created,
    precise: true,
  });
});

test("a file's change date is shown only when it says something", () => {
  assert.equal(
    getMeaningfulModified({
      created: "2016-10-12T10:00:00+02:00",
      modified: "2025-03-03T13:00:00+01:00",
    }),
    "",
  );
  assert.equal(
    getMeaningfulModified({
      created: "2026-09-01T10:00:00+02:00",
      modified: "2026-09-01T15:00:00+02:00",
    }),
    "",
  );
  assert.equal(
    getMeaningfulModified({
      created: "2026-09-01T10:00:00+02:00",
      modified: "2026-09-08T15:00:00+02:00",
    }),
    "2026-09-08T15:00:00+02:00",
  );
});

const sourceFiles = [
  {
    id: "https://web2.karlsruhe.de/ris/oparl/bodies/0001/files/681496",
    name: "Stellungnahme Antrag",
    accessUrl:
      "https://web2.karlsruhe.de/ris/oparl/bodies/0001/downloadfiles/a/00681496.pdf",
  },
];

test("a key point source names its attachment and links the PDF page", () => {
  assert.deepEqual(
    buildKeyPointSourceLinks(
      [
        {
          file: sourceFiles[0].id,
          page: 2,
          quote: "Eine Benennung mit zwei Nachnamen ist nicht vorgesehen",
        },
        null,
      ],
      sourceFiles,
    ),
    [
      {
        file: sourceFiles[0].id,
        name: "Stellungnahme Antrag",
        quote: "Eine Benennung mit zwei Nachnamen ist nicht vorgesehen",
        page: 2,
        pageHref: `${sourceFiles[0].accessUrl}#page=2`,
      },
      undefined,
    ],
  );
});

test("a key point source without a page has no PDF page link", () => {
  const [link] = buildKeyPointSourceLinks(
    [{ file: sourceFiles[0].id, quote: "Zitat" }],
    sourceFiles,
  );
  assert.equal(link?.file, sourceFiles[0].id);
  assert.equal(link?.page, undefined);
  assert.equal(link?.pageHref, undefined);
});

test("a source whose file is no longer attached gets no link", () => {
  assert.deepEqual(
    buildKeyPointSourceLinks(
      [{ file: "https://example.test/files/gone", page: 1, quote: "Zitat" }],
      sourceFiles,
    ),
    [undefined],
  );
  assert.deepEqual(buildKeyPointSourceLinks(undefined, sourceFiles), []);
});
