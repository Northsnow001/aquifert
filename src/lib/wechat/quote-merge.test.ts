import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { extractRfqCode } from "@/lib/trade/rfq-code";
import {
  buyerRequestFieldNames,
  filterMissingFields,
  looksLikePriceOnly,
  mergeOfferWithRfq,
  millOriginPortGaps,
  parseBareOffer,
  parseMillOriginPort,
  resolveQuoteRfqCode,
} from "@/lib/wechat/quote-merge";

const rfq = {
  code: "rfq#074",
  product_label: "Urea granular 46%",
  specification: "N 46%",
  quantity_mt: "5000",
  packing: "50 kg bags",
  incoterm: "CFR",
  destination_port: "Lagos",
  destination_country: "Nigeria",
  shipment_window: "December",
  origin_preference: "China",
};

describe("looksLikePriceOnly", () => {
  test("treats 1000 and 1000USD as a mill unit price", () => {
    assert.equal(looksLikePriceOnly("1000"), true);
    assert.equal(looksLikePriceOnly("1000USD"), true);
    assert.equal(looksLikePriceOnly("4600usd"), true);
    assert.equal(looksLikePriceOnly("400 MT"), false);
    assert.equal(looksLikePriceOnly("Hi"), false);
  });
});

describe("parseBareOffer", () => {
  test("reads a bare number as USD after an RFQ", () => {
    const offer = parseBareOffer("1000");
    assert.equal(offer.unit_price, "1000");
    assert.equal(offer.currency, "USD");
    assert.equal(offer.product_name, "");
  });

  test("reads a price-only FOB line", () => {
    const offer = parseBareOffer("400 USD/MT FOB");
    assert.equal(offer.unit_price, "400");
    assert.equal(offer.currency, "USD");
    assert.equal(offer.incoterms, "FOB");
    assert.equal(offer.product_name, "");
    assert.equal(offer.load_port, "");
  });

  test("puts the FOB port on load_port", () => {
    const offer = parseBareOffer("FOB Qingdao 400 USD/MT");
    assert.equal(offer.incoterms, "FOB");
    assert.equal(offer.load_port, "Qingdao");
    assert.equal(offer.unit_price, "400");
  });

  test("puts the CFR port on destination", () => {
    const offer = parseBareOffer("385 USD/MT CFR Lagos");
    assert.equal(offer.incoterms, "CFR");
    assert.equal(offer.destination, "Lagos");
  });
});

describe("resolveQuoteRfqCode", () => {
  test("uses a typed Trade ID first", () => {
    const code = resolveQuoteRfqCode({
      text: "rfq#80 400 USD/MT FOB",
      quoteType: "previous",
      confirmedRfqId: "rfq#074",
      stage: "awaiting_previous_quote",
    });
    assert.equal(code, "rfq#080");
  });

  test("uses Confirmed RFQ ID after an RFQ card when they omit rfq#", () => {
    const code = resolveQuoteRfqCode({
      text: "400 USD/MT FOB",
      quoteType: "previous",
      confirmedRfqId: "rfq#074",
      stage: "awaiting_previous_quote",
    });
    assert.equal(code, "rfq#074");
  });

  test("keeps the Trade ID when they send origin or load port after the price", () => {
    const code = resolveQuoteRfqCode({
      text: "Qingdao",
      quoteType: "",
      confirmedRfqId: "rfq#089",
      stage: "awaiting_origin_port",
    });
    assert.equal(code, "rfq#089");
  });

  test("uses last RFQ when they send only a number after the card", () => {
    const code = resolveQuoteRfqCode({
      text: "1000",
      quoteType: "",
      confirmedRfqId: "",
      stage: "",
      lastRfqCode: "rfq#089",
    });
    assert.equal(code, "rfq#089");
  });

  test("does not attach Last RFQ Ref on a cold hello", () => {
    const code = resolveQuoteRfqCode({
      text: "Hi",
      quoteType: "",
      confirmedRfqId: "",
      stage: "",
      lastRfqCode: "rfq#074",
    });
    assert.equal(code, "");
  });

  test("does not attach the confirmed ID to a new quote", () => {
    const code = resolveQuoteRfqCode({
      text: "new quote 400 USD/MT FOB Qingdao",
      quoteType: "previous",
      confirmedRfqId: "rfq#074",
      stage: "awaiting_previous_quote",
    });
    assert.equal(code, "");
  });
});

describe("parseMillOriginPort", () => {
  test("reads China and Qingdao from a mill follow-up", () => {
    const parsed = parseMillOriginPort("China, FOB Qingdao");
    assert.equal(parsed.origin, "China");
    assert.equal(parsed.load_port, "Qingdao");
    assert.equal(parsed.incoterms, "FOB");
    assert.deepEqual(millOriginPortGaps(parsed), []);
  });

  test("treats a bare port as load port", () => {
    const parsed = parseMillOriginPort("Qingdao");
    assert.equal(parsed.load_port, "Qingdao");
    assert.deepEqual(millOriginPortGaps(parsed), ["origin"]);
  });
});

describe("mergeOfferWithRfq", () => {
  test("fills product qty packing dest window from the buyer request and keeps mill price", () => {
    const merged = mergeOfferWithRfq(parseBareOffer("1000"), rfq, "rfq#074");
    assert.equal(merged.rfq_id, "rfq#074");
    assert.equal(merged.product_name, "Urea granular 46%");
    assert.equal(merged.quantity, "5000");
    assert.equal(merged.packaging, "50 kg bags");
    assert.equal(merged.unit_price, "1000");
    assert.equal(merged.currency, "USD");
    assert.equal(merged.incoterms, "CFR");
    assert.equal(merged.destination, "Lagos");
    assert.equal(merged.delivery_turnaround, "December");
    assert.equal(merged.origin, "");
    assert.equal(merged.load_port, "");
  });

  test("keeps a mill FOB load port and still fills product and qty", () => {
    const merged = mergeOfferWithRfq(parseBareOffer("FOB Qingdao 400 USD/MT"), rfq, "rfq#074");
    assert.equal(merged.load_port, "Qingdao");
    assert.equal(merged.incoterms, "FOB");
    assert.equal(merged.product_name, "Urea granular 46%");
    assert.equal(merged.quantity, "5000");
  });

  test("does not overwrite mill quantity or product", () => {
    const typed = parseBareOffer("400 USD/MT FOB");
    typed.product_name = "DAP";
    typed.quantity = "2000";
    const merged = mergeOfferWithRfq(typed, rfq, "rfq#074");
    assert.equal(merged.product_name, "DAP");
    assert.equal(merged.quantity, "2000");
  });

  test("does not treat mill origin as a buyer request field", () => {
    const names = buyerRequestFieldNames(rfq);
    assert.equal(names.includes("origin"), false);
    const merged = mergeOfferWithRfq(parseBareOffer("1000"), rfq, "rfq#074");
    assert.equal(merged.origin, "");
  });

  test("treats Buyer Request Fields as already known", () => {
    const names = buyerRequestFieldNames(rfq);
    assert.ok(names.includes("product_name"));
    assert.ok(names.includes("quantity"));
    const missing = filterMissingFields(
      ["product_name", "validity", "unit_price"],
      rfq,
      mergeOfferWithRfq(parseBareOffer("400 USD/MT FOB"), rfq, "rfq#074"),
    );
    assert.deepEqual(missing, ["validity"]);
  });
});

describe("extractRfqCode", () => {
  test("pads short ids", () => {
    assert.equal(extractRfqCode("rfq 74"), "rfq#074");
  });
});
