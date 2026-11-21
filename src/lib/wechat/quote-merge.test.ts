import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { extractRfqCode } from "@/lib/trade/rfq-code";
import {
  buyerRequestFieldNames,
  filterMissingFields,
  mergeOfferWithRfq,
  parseBareOffer,
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
};

describe("parseBareOffer", () => {
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

describe("mergeOfferWithRfq", () => {
  test("fills product qty packing dest window from the buyer request and keeps mill price", () => {
    const merged = mergeOfferWithRfq(parseBareOffer("400 USD/MT FOB"), rfq, "rfq#074");
    assert.equal(merged.rfq_id, "rfq#074");
    assert.equal(merged.product_name, "Urea granular 46%");
    assert.equal(merged.quantity, "5000");
    assert.equal(merged.packaging, "50 kg bags");
    assert.equal(merged.unit_price, "400");
    assert.equal(merged.incoterms, "FOB");
    assert.equal(merged.destination, "Lagos");
    assert.equal(merged.delivery_turnaround, "December");
  });

  test("does not overwrite mill quantity or product", () => {
    const typed = parseBareOffer("400 USD/MT FOB");
    typed.product_name = "DAP";
    typed.quantity = "2000";
    const merged = mergeOfferWithRfq(typed, rfq, "rfq#074");
    assert.equal(merged.product_name, "DAP");
    assert.equal(merged.quantity, "2000");
  });

  test("treats Buyer Request Fields as already known", () => {
    const names = buyerRequestFieldNames(rfq);
    assert.ok(names.includes("product_name"));
    assert.ok(names.includes("quantity"));
    const missing = filterMissingFields(["product_name", "validity", "unit_price"], rfq, mergeOfferWithRfq(parseBareOffer("400 USD/MT FOB"), rfq, "rfq#074"));
    assert.deepEqual(missing, ["validity"]);
  });
});

describe("extractRfqCode", () => {
  test("pads short ids", () => {
    assert.equal(extractRfqCode("rfq 74"), "rfq#074");
  });
});
