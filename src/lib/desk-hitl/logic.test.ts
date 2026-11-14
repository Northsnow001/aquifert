import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buyerUnitPrice, classifyBuyerReply, deskPhase, indicationWhatsApp, looksLikeNewRfq, parseFollowUpIntent, parseReplyIntent, parseShortlistBody } from "@/lib/desk-hitl/logic";
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
    assert.equal(classifyBuyerReply("NeoGuard"), "chat");
  });
});

describe("looksLikeNewRfq", () => {
  it("treats hello and a different product as a new enquiry", () => {
    assert.equal(looksLikeNewRfq("hello"), true);
    assert.equal(looksLikeNewRfq("SplashFert", "Normal Alkaline"), true);
    assert.equal(looksLikeNewRfq("new order"), true);
    assert.equal(looksLikeNewRfq("another product"), true);
  });

  it("keeps packing and payment answers on the current deal", () => {
    assert.equal(looksLikeNewRfq("25kg bags"), false);
    assert.equal(looksLikeNewRfq("ok send it"), false);
    assert.equal(looksLikeNewRfq("China origin, SGS"), false);
    assert.equal(looksLikeNewRfq("BL 60"), false);
    assert.equal(looksLikeNewRfq("CAD"), false);
    assert.equal(looksLikeNewRfq("TT 30 days"), false);
    assert.equal(looksLikeNewRfq("Normal Alkaline", "Normal Alkaline"), false);
    assert.equal(looksLikeNewRfq("india", "GoldenFert"), false);
    assert.equal(looksLikeNewRfq("India", "GoldenFert"), false);
    assert.equal(looksLikeNewRfq("lagos", "GoldenFert"), false);
    assert.equal(looksLikeNewRfq("jumbo bags", "GoldenFert"), false);
  });
});

describe("deskPhase", () => {
  it("maps inbound event to the buyer-desk prompt phase", () => {
    assert.equal(deskPhase({ event: "chat" }), "rfq");
    assert.equal(deskPhase({ event: "firm_interest", collectingTerms: true }), "post_yes");
    assert.equal(deskPhase({ event: "chat", firmOfferStatus: "sent" }), "offer_review");
    assert.equal(deskPhase({ event: "chat", piStatus: "sent" }), "pi_sent");
  });
});

describe("parseFollowUpIntent", () => {
  it("keeps packing answers on firm_order", () => {
    assert.equal(parseFollowUpIntent('{"intent":"firm_order"}'), "firm_order");
    assert.equal(parseFollowUpIntent('{"intent":"chat"}'), "chat");
  });
});

describe("parseReplyIntent", () => {
  it("maps Gemini JSON to desk kinds", () => {
    assert.equal(parseReplyIntent('{"intent":"agree"}'), "agree");
    assert.equal(parseReplyIntent('{"intent":"go ahead"}'), null);
    assert.equal(parseReplyIntent('{"intent":"negotiate"}'), "negotiate");
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
    assert.equal(parsed.buyerEmail, "");
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
