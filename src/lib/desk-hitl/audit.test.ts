import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dealsForBuyer, mergeBuyerAudit } from "@/lib/desk-hitl/audit";
import type { DeskDeal } from "@/lib/desk-hitl/types";
import type { TradeMessage } from "@/lib/trade/types";

describe("dealsForBuyer", () => {
  it("matches by phone or email", () => {
    const deal = {
      id: "deal-rfq-081",
      requestId: "rfq#081",
      buyerPhone: "+2349022834241",
      buyerEmail: "kaytoba49@gmail.com",
      messages: [],
    } as unknown as DeskDeal;
    assert.equal(dealsForBuyer([deal], "2349022834241", "").length, 1);
    assert.equal(dealsForBuyer([deal], "", "Kaytoba49@gmail.com").length, 1);
    assert.equal(dealsForBuyer([deal], "", "other@test.com").length, 0);
  });
});

describe("mergeBuyerAudit", () => {
  it("keeps desk system events and drops a duplicate WhatsApp copy", () => {
    const wa: TradeMessage[] = [
      {
        id: "wa-1",
        direction: "in",
        channel: "whatsapp",
        body: "yes",
        fromAddress: "+234",
        toAddress: "",
        createdAt: "2026-11-22T09:12:00.000Z",
        payload: {},
      },
    ];
    const deal = {
      id: "deal-rfq-081",
      requestId: "rfq#081",
      messages: [
        { id: "d-1", at: "2026-11-22T09:12:02.000Z", from: "buyer", channel: "whatsapp", text: "yes" },
        {
          id: "d-2",
          at: "2026-11-22T11:21:00.000Z",
          from: "system",
          channel: "email",
          text: "Firm offer emailed to Whorl Fert <kaytoba49@gmail.com> at USD 600 / MT.",
        },
      ],
    } as unknown as DeskDeal;
    const lines = mergeBuyerAudit(wa, [deal]);
    assert.equal(lines.filter((row) => /yes/i.test(row.text)).length, 1);
    assert.ok(lines.some((row) => row.role === "system" && /Whorl Fert/.test(row.text)));
  });
});
