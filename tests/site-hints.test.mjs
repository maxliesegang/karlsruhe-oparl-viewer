import assert from "node:assert/strict";
import test from "node:test";
import { isFreshSiteVisit, pickSiteHint } from "../src/shared/site-hints.ts";

const origin = "https://example.org";

test("pickSiteHint picks by random index and handles empty lists", () => {
  assert.equal(
    pickSiteHint(["a", "b", "c"], () => 0.5),
    "b",
  );
  assert.equal(
    pickSiteHint([], () => 0),
    undefined,
  );
});

test("isFreshSiteVisit treats reloads as fresh", () => {
  assert.equal(isFreshSiteVisit("reload", `${origin}/a`, origin), true);
});

test("isFreshSiteVisit keeps state across in-site navigation", () => {
  assert.equal(isFreshSiteVisit("navigate", `${origin}/a`, origin), false);
  assert.equal(isFreshSiteVisit("back_forward", "", origin), false);
});

test("isFreshSiteVisit treats external or missing referrers as fresh", () => {
  assert.equal(
    isFreshSiteVisit("navigate", "https://other.example/", origin),
    true,
  );
  assert.equal(isFreshSiteVisit("navigate", "", origin), true);
  assert.equal(isFreshSiteVisit(undefined, "", origin), true);
});
