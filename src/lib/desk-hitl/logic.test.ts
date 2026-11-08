import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buyerUnitPrice, classifyBuyerReply, indicationWhatsApp, parseShortlistBody } from "@/lib/desk-hitl/logic";
import type { DeskDeal } from "@/lib/desk-hitl/types";

describe("buyerUnitPrice", () => {
  it("applies margin on the supplier unit", () => {
    assert.equal(buyerUnitPrice(400, 8), 432);
    assert.equal(buyerUnitPrice(100.5, 10), 110.55);
  });
});

describe("classifyBuyerReply", () => {
  it("treats short yes/agree as firm interest", () => {
    assert.equal(classifyBuyerReply("YES"), "agree");
    assert.equal(classifyBuyerReply("Yes please"), "agree");
    assert.equal(classifyBuyerReply("ok, we agree"), "agree");
    assert.equal(classifyBuyerReply("confirmed"), "agree");
  });

  it("keeps counters in negotiation", () => {
    assert.equal(classifyBuyerReply("yes but too high"), "negotiate");
    assert.equal(classifyBuyerReply("can you reduce to 410"), "negotiate");
    assert.equal(classifyBuyerReply("what is the load port?"), "negotiate");
  });

  it("does not treat onboarding or RFQ chat as a desk reply", () => {
    assert.equal(classifyBuyerReply("Kaytoba49@gmail.com\nCountry is Nigeria"), "chat");
    assert.equal(classifyBuyerReply("Hi"), "chat");
    assert.equal(classifyBuyerReply("500 MT urea CFR Lagos"), "chat");
  });
});

describe("parseShortlistBody", () => {
  it("takes the first three priced offers and buyer phone", () => {
    const parsed = parseShortlistBody({
      requestId: "REQ-9",
      product: "Urea 46",
      quantityMt: "500",
      destination: "Lagos",
      phone: "+234 801 000 0000",
      offers: [
        { supplier: "A", unitPrice: 400, currency: "USD", openid: "ovOFi3E3kW8qc8PI_FlNLxwBfOuk" },
        { supplier_name: "B", price: "410" },
        { supplierName: "C", unit_price: 390 },
        { supplierName: "D", unitPrice: 380 },
      ],
      callbackUrl: "https://n8n.example/webhook/wait",
    });
    assert.ok(parsed);
    assert.equal(parsed.offers.length, 3);
    assert.equal(parsed.buyerPhone, "+2348010000000");
    assert.equal(parsed.quantityMt, 500);
    assert.equal(parsed.callbackUrl, "https://n8n.example/webhook/wait");
  });

  it("rejects a shortlist with no unit prices", () => {
    assert.equal(parseShortlistBody({ requestId: "x", product: "Urea", offers: [{ supplier: "A" }] }), null);
  });
});

describe("indicationWhatsApp", () => {
  it("asks the buyer to reply YES", () => {
    const deal = {
      product: "DAP",
      quantityMt: 1000,
      destination: "Apapa",
      incoterm: "CFR",
      buyerPrice: 432,
      currency: "USD",
      selectedOfferId: "off-1",
      offers: [{ id: "off-1", destination: "Apapa", incoterm: "CFR" }],
    } as DeskDeal;
    const text = indicationWhatsApp(deal);
    assert.match(text, /Indication: USD 432 \/ MT/);
    assert.match(text, /Reply YES/);
  });
});
