import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DESK_QUOTE_WAIT_MS, pickDeskShortlist, type DeskCandidate } from "@/lib/trade/desk-closer-logic";

function quote(partial: Partial<DeskCandidate> & { supplierId: string; unitPrice: number }): DeskCandidate {
  return {
    supplierName: partial.supplierName || partial.supplierId,
    currency: "USD",
    incoterm: "FOB",
    quantityMt: 300,
    loadPort: "Qingdao",
    destination: "",
    receivedAt: partial.receivedAt || "2026-11-22T08:00:00.000Z",
    wechatOpenid: "",
    ...partial,
  };
}

describe("pickDeskShortlist", () => {
  test("waits until three unique suppliers have quoted", () => {
    const picked = pickDeskShortlist({
      quotes: [quote({ supplierId: "a", unitPrice: 400 }), quote({ supplierId: "b", unitPrice: 410 })],
      fanoutAt: "2026-11-22T08:00:00.000Z",
      now: Date.parse("2026-11-22T10:00:00.000Z"),
    });
    assert.equal(picked.promote, false);
    assert.equal(picked.reason, "waiting");
  });

  test("moves the first three quotes to the desk", () => {
    const picked = pickDeskShortlist({
      quotes: [
        quote({ supplierId: "a", unitPrice: 400, receivedAt: "2026-11-22T08:01:00.000Z" }),
        quote({ supplierId: "a", unitPrice: 390, receivedAt: "2026-11-22T08:02:00.000Z" }),
        quote({ supplierId: "b", unitPrice: 410, receivedAt: "2026-11-22T08:03:00.000Z" }),
        quote({ supplierId: "c", unitPrice: 420, receivedAt: "2026-11-22T08:04:00.000Z" }),
        quote({ supplierId: "d", unitPrice: 430, receivedAt: "2026-11-22T08:05:00.000Z" }),
      ],
      fanoutAt: "2026-11-22T08:00:00.000Z",
      now: Date.parse("2026-11-22T08:10:00.000Z"),
    });
    assert.equal(picked.promote, true);
    assert.equal(picked.reason, "three_quotes");
    assert.deepEqual(
      picked.offers.map((row) => row.supplierId),
      ["a", "b", "c"],
    );
  });

  test("after 24 hours sends whatever unique quotes we have", () => {
    const fanoutAt = "2026-11-21T08:00:00.000Z";
    const picked = pickDeskShortlist({
      quotes: [quote({ supplierId: "a", unitPrice: 400 })],
      fanoutAt,
      now: Date.parse(fanoutAt) + DESK_QUOTE_WAIT_MS,
    });
    assert.equal(picked.promote, true);
    assert.equal(picked.reason, "wait_elapsed");
    assert.equal(picked.offers.length, 1);
  });

  test("does not send an empty book after 24 hours", () => {
    const picked = pickDeskShortlist({
      quotes: [],
      fanoutAt: "2026-11-20T08:00:00.000Z",
      now: Date.parse("2026-11-22T08:00:00.000Z"),
    });
    assert.equal(picked.promote, false);
    assert.equal(picked.reason, "none");
  });
});
