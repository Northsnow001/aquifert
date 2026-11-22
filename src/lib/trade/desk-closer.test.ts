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

  test("keeps an early FOB price with no load port ahead of later complete quotes", () => {
    const picked = pickDeskShortlist({
      quotes: [
        quote({
          supplierId: "S-014",
          supplierName: "Whorl Fert",
          unitPrice: 3900,
          receivedAt: "2026-11-22T13:07:00.000Z",
          loadPort: "",
          destination: "to confirm",
        }),
        quote({ supplierId: "S-015", supplierName: "Northsnow", unitPrice: 4009, receivedAt: "2026-11-22T13:09:00.000Z", loadPort: "Qingdao" }),
        quote({ supplierId: "S-005", supplierName: "Campbell", unitPrice: 4018, receivedAt: "2026-11-22T13:09:00.000Z", loadPort: "Tianjin" }),
        quote({ supplierId: "S-006", supplierName: "Matthew Limited", unitPrice: 4027, receivedAt: "2026-11-22T13:09:00.000Z", loadPort: "Lianyungang" }),
      ],
      fanoutAt: "2026-11-22T12:00:00.000Z",
      now: Date.parse("2026-11-22T13:10:00.000Z"),
    });
    assert.equal(picked.promote, true);
    assert.deepEqual(
      picked.offers.map((row) => row.supplierName),
      ["Whorl Fert", "Campbell", "Matthew Limited"],
    );
  });

  test("keeps the earliest unique supplier when later dummy quotes arrive", () => {
    const picked = pickDeskShortlist({
      quotes: [
        quote({ supplierId: "S-014", supplierName: "Whorl Fert", unitPrice: 400, receivedAt: "2026-11-21T22:50:00.000Z", offerCode: "OFF-201" }),
        quote({ supplierId: "S-015", supplierName: "Northsnow", unitPrice: 410, receivedAt: "2026-11-21T22:52:00.000Z", offerCode: "OFF-202" }),
        quote({ supplierId: "S-005", supplierName: "Campbell", unitPrice: 420, receivedAt: "2026-11-22T06:51:00.000Z", offerCode: "OFF-205" }),
        quote({ supplierId: "S-004", supplierName: "MATT Ltd", unitPrice: 430, receivedAt: "2026-11-22T06:51:00.000Z", offerCode: "OFF-203" }),
        quote({ supplierId: "S-006", supplierName: "Matthew Limited", unitPrice: 440, receivedAt: "2026-11-22T06:51:00.000Z", offerCode: "OFF-204" }),
      ],
      fanoutAt: "2026-11-21T20:00:00.000Z",
      now: Date.parse("2026-11-22T07:00:00.000Z"),
    });
    assert.equal(picked.promote, true);
    assert.deepEqual(
      picked.offers.map((row) => row.supplierName),
      ["Whorl Fert", "Northsnow", "MATT Ltd"],
    );
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
