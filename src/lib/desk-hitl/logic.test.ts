import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agreedPriceFromThread, applyBuyerTermAnswer, buyerUnitPrice, classifyBuyerReply, deskPhase, draftProductFrom, emptyExecution, firmOfferNextAsk, firmOfferPackingAsk, hideBuyerPriceFromSupplier, indicationWhatsApp, isPlainRefusal, knownFirmTermsFromThread, lockedInboundDecision, looksLikeCounter, looksLikeNewRfq, looksLikeNewSupply, mentionsLockedRequest, millFirmOfferWeChat, nextFirmAsk, offerIsLocked, parseBuyerEmailReply, parseFollowUpIntent, parseReplyIntent, parseShortlistBody, retireQueuedIndicationAsks, rfqKey, seedFirmExecution, shouldTakeLocked } from "@/lib/desk-hitl/logic";
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
    assert.equal(isPlainRefusal("No"), true);
    assert.equal(isPlainRefusal("no thanks"), true);
    assert.equal(isPlainRefusal("no but too high"), false);
    assert.equal(isPlainRefusal("can you do 480"), false);
    assert.equal(looksLikeCounter("can you do 480"), true);
    assert.equal(looksLikeCounter("500 MT urea CFR Lagos"), false);
    assert.equal(
      agreedPriceFromThread({
        quantityMt: 4000,
        messages: [
          { from: "buyer", text: "Too expensive" },
          { from: "desk", text: "how much do you plan" },
          { from: "buyer", text: "400" },
          { from: "desk", text: "Okay that's fine" },
        ],
      }),
      400,
    );
    assert.equal(agreedPriceFromThread({ quantityMt: 4000, messages: [{ from: "buyer", text: "4000" }] }), null);
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

describe("locked request", () => {
  it("locks a sent firm offer and a sent proforma", () => {
    assert.equal(offerIsLocked({ firmOffer: { status: "sent" }, pi: null }), true);
    assert.equal(offerIsLocked({ firmOffer: null, pi: { status: "sent" } }), true);
    assert.equal(offerIsLocked({ firmOffer: { status: "review" }, pi: null }), false);
  });

  it("treats a different product or 'new supply' as a new request", () => {
    assert.equal(looksLikeNewSupply("Corkage Fert", "Normal Alkaline"), true);
    assert.equal(looksLikeNewSupply("need a new supply", "Normal Alkaline"), true);
    assert.equal(looksLikeNewSupply("600 Apapa port", "Normal Alkaline"), false);
    assert.equal(looksLikeNewSupply("hello", "Normal Alkaline"), false);
    assert.equal(looksLikeNewSupply("Normal Alkaline", "Normal Alkaline"), false);
  });

  it("keeps a quantity on the draft, and a proforma mention leaves it", () => {
    assert.equal(mentionsLockedRequest("where is the PI", "rfq#027"), true);
    assert.equal(mentionsLockedRequest("600 Apapa port", "rfq#027"), false);
    assert.deepEqual(
      lockedInboundDecision({ text: "Corkage Fert", product: "Normal Alkaline", requestId: "rfq#027", draft: null, piSent: true }),
      { take: "new_supply", phase: "rfq", product: "Corkage Fert" },
    );
    assert.equal(draftProductFrom("600 Apapa port", "Corkage Fert"), "Corkage Fert");
    assert.deepEqual(
      lockedInboundDecision({ text: "600 Apapa port", product: "Normal Alkaline", requestId: "rfq#027", draft: "Corkage Fert", piSent: true }),
      { take: "new_supply", phase: "rfq", product: "Corkage Fert" },
    );
    assert.deepEqual(
      lockedInboundDecision({ text: "600 Apapa port", product: "Normal Alkaline", requestId: "rfq#027", draft: null, piSent: true }),
      { take: "follow_up", phase: "pi_sent", product: "" },
    );
    assert.deepEqual(
      lockedInboundDecision({ text: "the invoice", product: "Normal Alkaline", requestId: "rfq#027", draft: "Corkage Fert", piSent: true }),
      { take: "follow_up", phase: "pi_sent", product: "Corkage Fert" },
    );
    assert.deepEqual(
      lockedInboundDecision({
        text: "no, proceed to prepare firm offer",
        product: "Cursor IV",
        requestId: "rfq#081",
        draft: "Uranium XL",
        piSent: false,
      }),
      { take: "new_supply", phase: "rfq", product: "Uranium XL" },
    );
  });

  it("gives a YES on an open indication to that indication, not the old proforma", () => {
    assert.equal(
      shouldTakeLocked({ hasOpenIndication: true, collectingTerms: false, acceptingFirmOffer: false, namesDocument: false }),
      false,
    );
    assert.equal(
      shouldTakeLocked({ hasOpenIndication: false, collectingTerms: true, acceptingFirmOffer: false, namesDocument: false }),
      false,
    );
    assert.equal(
      shouldTakeLocked({ hasOpenIndication: true, collectingTerms: false, acceptingFirmOffer: false, namesDocument: true }),
      true,
    );
    assert.equal(
      shouldTakeLocked({ hasOpenIndication: false, collectingTerms: false, acceptingFirmOffer: false, namesDocument: false }),
      true,
    );
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
  it("keeps every priced offer and shortlists the first three", () => {
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
    assert.equal(parsed.offers.length, 4);
    assert.equal(parsed.offers[2].shortlisted, true);
    assert.equal(parsed.offers[3].shortlisted, false);
    assert.equal(parsed.offers[0].channel, "wechat");
    assert.equal(parsed.buyerPhone, "+2348010000000");
    assert.equal(parsed.buyerEmail, "");
    assert.equal(parsed.quantityMt, 500);
    assert.equal(parsed.callbackUrl, "https://n8n.example/webhook/wait");
  });

  it("rejects a shortlist with no unit prices", () => {
    assert.equal(parseShortlistBody({ requestId: "x", product: "Urea", offers: [{ supplier: "A" }] }), null);
  });
});

describe("millFirmOfferWeChat", () => {
  it("uses the mill RFQ quote and never the buyer price", () => {
    const deal = {
      id: "deal-uus908",
      requestId: "uus908",
      product: "Urea",
      quantityMt: 300,
      destination: "Lagos, Nigeria",
      incoterm: "CFR",
      buyerPrice: 221.4,
      currency: "USD",
      selectedOfferId: "off-1",
      offers: [
        {
          id: "off-1",
          supplierName: "Harbour",
          unitPrice: 205,
          currency: "USD",
          incoterm: "CFR",
          quantityMt: 300,
          loadPort: "",
          destination: "Lagos, Nigeria",
          receivedAt: "",
          notes: "",
          wechatOpenId: "oMillHarbour",
        },
      ],
      execution: {
        packing: "Big bags, no pallets",
        origin: "",
        destinationPort: "Lagos, Nigeria",
        incoterm: "CFR",
        shipmentWindow: "Dec 2026",
        paymentTerms: "",
        inspection: "",
        documentation: "",
        specification: "",
        urgency: "",
        notes: "",
        confirmedAt: "",
      },
      foPack: {
        attachments: [
          { id: "a", kind: "coa", filename: "coa.pdf", contentType: "application/pdf", uploadedAt: "" },
          { id: "b", kind: "tds", filename: "tds.pdf", contentType: "application/pdf", uploadedAt: "" },
        ],
        supplierConfirmedAt: null,
        supplierConfirmedBy: null,
      },
    } as DeskDeal;
    const mill = millFirmOfferWeChat(deal);
    assert.ok(mill);
    assert.equal(mill.supplierUnitPrice, 205);
    assert.match(mill.millMessage, /Price: USD 205 \/ MT/);
    assert.doesNotMatch(mill.millMessage, /221/);
    assert.match(mill.millMessage, /COA\/TDS req/);
    assert.match(mill.millMessage, /Payment\/Validity: TBA/);
    assert.equal(mill.wechatOpenId, "oMillHarbour");
    assert.match(mill.millMessage, /check email/i);
  });
});

describe("hideBuyerPriceFromSupplier", () => {
  it("strips the indication and keeps the supplier quote", () => {
    const text = hideBuyerPriceFromSupplier("Buyer 221.4 mill 205", 221.4, 205);
    assert.doesNotMatch(text, /221/);
    assert.match(text, /205/);
  });
});

describe("indicationWhatsApp", () => {
  it("retires a queued indication after YES so it cannot resend", () => {
    const retired = retireQueuedIndicationAsks([
      { from: "desk", text: "Reply YES to confirm firm interest, or tell us what you need changed.", outboundStatus: "queued" as const },
      { from: "desk", text: "How would you like it packed?", outboundStatus: "queued" as const },
    ]);
    assert.equal(retired[0].outboundStatus, "sent");
    assert.equal(retired[1].outboundStatus, "queued");
  });

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

describe("parseBuyerEmailReply", () => {
  it("reads a Gmail YES on the firm offer", () => {
    const parsed = parseBuyerEmailReply({
      from: "Deji <deji@buyer.test>",
      subject: "Re: Aquifert firm offer rfq#079 — Urea",
      text: "YES",
    });
    assert.ok(parsed && !("ignore" in parsed));
    assert.equal(parsed.from, "deji@buyer.test");
    assert.equal(parsed.requestId, "79");
    assert.equal(parsed.kind, "agree");
  });

  it("reads the Gmail trigger from-object and an FO- number", () => {
    const parsed = parseBuyerEmailReply({
      from: { value: [{ address: "deji@buyer.test", name: "Deji" }], text: "Deji <deji@buyer.test>" },
      subject: "Re: Aquifert firm offer FO-0081 — Cursor IV",
      text: "YES\n\nOn Sun, Aquifert wrote: Reply YES to this email to accept.",
    });
    assert.ok(parsed && !("ignore" in parsed));
    assert.equal(parsed.from, "deji@buyer.test");
    assert.equal(parsed.requestId, "81");
    assert.equal(parsed.kind, "agree");
  });

  it("ignores the outbound firm-offer copy in the same inbox", () => {
    assert.deepEqual(
      parseBuyerEmailReply({
        from: "Aquifert <noreply@aquifert.com>",
        subject: "Aquifert firm offer FO-0081 — Cursor IV",
        text: "Reply YES to this email to accept.",
      }),
      { ignore: true },
    );
  });

  it("skips outbound proforma mail", () => {
    assert.deepEqual(
      parseBuyerEmailReply({
        from: "noreply@aquifert.com",
        subject: "Aquifert proforma invoice rfq#079 — Urea",
        text: "Please find attached",
      }),
      { ignore: true },
    );
  });

  it("does not treat a proforma JSON payload as mail", () => {
    assert.equal(parseBuyerEmailReply({ document: "proforma", product: "Urea", reference: "rfq#079" }), null);
  });

  it("normalises rfq keys", () => {
    assert.equal(rfqKey("rfq#079"), "79");
    assert.equal(rfqKey("deal-rfq-079"), "79");
  });
});

describe("firm terms after YES", () => {
  it("does not store a bare YES as packing", () => {
    const exec = applyBuyerTermAnswer(emptyExecution(), "yes");
    assert.equal(exec.packing, "");
    assert.match(firmOfferPackingAsk({ product: "Cursor IV", quantityMt: 800, currency: "USD", buyerPrice: 648 }), /packed/i);
    assert.match(firmOfferPackingAsk({ product: "Cursor IV", quantityMt: 800, currency: "USD", buyerPrice: 648 }), /648/);
  });

  it("keeps bulk from the RFQ recap and asks payment, not packing again", () => {
    const recap = [
      "Please confirm if the following details are correct:",
      "· Product: Cursor IV (high grade)",
      "· Quantity: 800 MT",
      "· Packing: bulk",
      "· Incoterms/Port: CIF Delhi, India",
      "· Shipping: 2-week window",
    ].join("\n");
    const known = knownFirmTermsFromThread([{ text: recap }]);
    assert.equal(known.packing, "bulk");
    assert.match(String(known.incoterm), /CIF/i);
    assert.match(String(known.destinationPort), /Delhi/i);
    const exec = seedFirmExecution(emptyExecution(), known);
    const ask = firmOfferNextAsk(exec, { product: "Cursor IV", quantityMt: 800, currency: "USD", buyerPrice: 648 });
    assert.match(ask.text, /packing stays bulk/i);
    assert.match(ask.text, /pay/i);
    assert.doesNotMatch(ask.text, /how would you like the .* packed/i);
    const jumbo = applyBuyerTermAnswer(exec, "jumbo bags");
    assert.equal(jumbo.packing, "jumbo bags");
  });

  it("asks packing, then payment, then a recap", () => {
    let exec = emptyExecution();
    assert.equal(nextFirmAsk(exec).kind, "question");
    exec = applyBuyerTermAnswer(exec, "jumbo bags");
    assert.equal(exec.packing, "jumbo bags");
    const payAsk = nextFirmAsk(exec);
    assert.equal(payAsk.kind, "question");
    assert.match(payAsk.text, /pay/i);
    exec = applyBuyerTermAnswer(exec, "LC at sight");
    assert.equal(exec.paymentTerms, "LC at sight");
    const originAsk = nextFirmAsk(exec);
    assert.match(originAsk.text, /origin preference/i);
    assert.doesNotMatch(originAsk.text, /load port/i);
    exec = applyBuyerTermAnswer(exec, "China ok");
    assert.equal(nextFirmAsk(exec).kind, "recap");
  });
});
