import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatOfferCode, mondayOf } from "@/lib/trade/offer-code";

describe("formatOfferCode", () => {
  test("matches the workbook Offer ID shape", () => {
    assert.equal(formatOfferCode(new Date("2026-11-08T21:50:39.311Z"), 0), "OFF-20261108215039-0");
    assert.equal(formatOfferCode(new Date("2026-11-08T22:22:03.172Z"), 2), "OFF-20261108222203-2");
  });
});

describe("mondayOf", () => {
  test("uses the UTC Monday of that week", () => {
    assert.equal(mondayOf(new Date("2026-11-08T21:50:39.311Z")), "2026-11-02");
    assert.equal(mondayOf(new Date("2026-11-09T10:31:51.568Z")), "2026-11-09");
  });
});
