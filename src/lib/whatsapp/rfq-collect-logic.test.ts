import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coerceRfqPhaseTurn,
  hasNewTradeIntent,
  isolateExtractToTrade,
  nextMissingRfqField,
  productsDiffer,
  rfqCollectComplete,
  shouldNotifyTradeOpened,
  shouldStartNewRfq,
  threadSinceNewTrade,
} from "@/lib/whatsapp/rfq-collect-logic";

describe("hasNewTradeIntent", () => {
  it("reads a new-request phrase on this turn or a recent inbound", () => {
    assert.equal(hasNewTradeIntent("i need a new request"), true);
    assert.equal(hasNewTradeIntent("Uranium XL", ["i need a new request"]), true);
    assert.equal(hasNewTradeIntent("CAD", ["origin preferences or SGS"]), false);
  });
});

describe("shouldStartNewRfq", () => {
  it("opens a new collecting RFQ for an existing live buyer once they ask for a new request", () => {
    assert.equal(
      shouldStartNewRfq({
        text: "i need a new request",
        latestStatus: "firm_interest",
      }),
      true,
    );
    assert.equal(
      shouldStartNewRfq({
        text: "Uranium XL",
        recentInbound: ["i need a new request"],
        latestStatus: "firm_interest",
        requestedPhase: "rfq",
      }),
      true,
    );
  });

  it("does not start another RFQ while the current one is still collecting", () => {
    assert.equal(
      shouldStartNewRfq({
        text: "Uranium XL",
        recentInbound: ["i need a new request"],
        latestStatus: "collecting",
      }),
      false,
    );
  });

  it("does not start a new RFQ for the first enquiry", () => {
    assert.equal(shouldStartNewRfq({ text: "Urea", latestStatus: "" }), false);
  });

  it("starts a new trade when the product is not the live one", () => {
    assert.equal(
      shouldStartNewRfq({
        text: "Uranium XL",
        latestStatus: "firm_interest",
        latestProduct: "Cursor IV",
      }),
      true,
    );
    assert.equal(productsDiffer("Uranium XL", "Cursor IV"), true);
    assert.equal(productsDiffer("Cursor IV", "Cursor IV 46%"), false);
  });
});

describe("isolateExtractToTrade", () => {
  it("does not copy Delhi CIF CAD from another trade onto Uranium XL", () => {
    const isolated = isolateExtractToTrade(
      {
        product: "Uranium XL",
        quantity_mt: "400",
        destination: "Delhi",
        discharge_port: "Delhi",
        incoterm_pref: "CIF",
        payment_pref: "CAD",
        inspection: "SGS",
      },
      ["i need a new request", "Uranium XL", "400MT, and SGS"],
      "400MT, and SGS",
    );
    assert.equal(isolated?.product, "Uranium XL");
    assert.equal(isolated?.quantity_mt, "400");
    assert.equal(isolated?.inspection, "SGS");
    assert.equal(isolated?.destination, undefined);
    assert.equal(isolated?.incoterm_pref, undefined);
    assert.equal(isolated?.payment_pref, undefined);
  });
});

describe("threadSinceNewTrade", () => {
  it("drops the previous deal once they ask for a new request", () => {
    const thread = [
      { direction: "out", body: "Reply YES to confirm firm interest" },
      { direction: "in", body: "YES" },
      { direction: "out", body: "How would you like to pay" },
      { direction: "in", body: "i need a new request" },
      { direction: "out", body: "What product and quantity" },
    ];
    assert.deepEqual(
      threadSinceNewTrade(thread, "Uranium XL").map((row) => row.body),
      ["i need a new request", "What product and quantity"],
    );
    assert.deepEqual(threadSinceNewTrade(thread, "i need a new request"), []);
  });
});

describe("coerceRfqPhaseTurn", () => {
  it("keeps a new order on RFQ collect instead of a firm offer", () => {
    const jumped = coerceRfqPhaseTurn({
      route: "firm_offer_ready",
      reply: "Thanks — I’ll send the firm offer now for you to review.",
      extract: { product: "Uranium XL", quantity_mt: "400" },
      text: "no, proceed to prepare firm offer",
    });
    assert.equal(jumped.route, "rfq_collect");
    assert.match(jumped.reply, /packed/i);
    assert.doesNotMatch(jumped.reply, /firm offer/i);
  });

  it("does not confirm to suppliers until the recap is complete and the buyer says yes", () => {
    const early = coerceRfqPhaseTurn({
      route: "rfq_ready",
      reply: "Thank you for confirming",
      extract: { product: "Uranium XL", quantity_mt: "400" },
      text: "400MT, and SGS",
    });
    assert.equal(early.route, "rfq_collect");
    assert.equal(rfqCollectComplete({ product: "Uranium XL", quantity_mt: "400" }), false);
    assert.equal(nextMissingRfqField({ product: "Uranium XL", quantity_mt: "400" })?.key, "packing");

    const recap = coerceRfqPhaseTurn({
      route: "rfq_collect",
      reply: "Noted",
      extract: {
        product: "Uranium XL",
        quantity_mt: "400",
        packing: "50kg bags",
        incoterm_pref: "CIF",
        discharge_port: "Delhi",
        timing_notes: "January",
      },
      text: "50kg bags, CIF Delhi, January",
    });
    assert.equal(recap.route, "rfq_collect");
    assert.match(recap.reply, /Please confirm if the following details are correct/i);

    const confirmed = coerceRfqPhaseTurn({
      route: "rfq_ready",
      reply: "Thank you for confirming",
      extract: recap.extract,
      text: "yes",
    });
    assert.equal(confirmed.route, "rfq_ready");
  });
});

describe("shouldNotifyTradeOpened", () => {
  it("pages admins when a product name first lands, including a different SKU on an existing buyer", () => {
    assert.equal(shouldNotifyTradeOpened("", "Uranium XL"), true);
    assert.equal(shouldNotifyTradeOpened("Cursor IV", "Uranium XL"), true);
    assert.equal(shouldNotifyTradeOpened("Uranium XL", "Uranium XL"), false);
    assert.equal(shouldNotifyTradeOpened("", ""), false);
  });
});
