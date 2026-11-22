import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bindInboundToTrade,
  buyerPhaseFromStatus,
  coerceRfqPhaseTurn,
  hasNewTradeIntent,
  isolateExtractToTrade,
  isCourtesyMessage,
  isRfqRecapConfirm,
  isRfqRecapConfirmTurn,
  nextMissingRfqField,
  parseRfqRecap,
  productsDiffer,
  rfqCollectComplete,
  shouldNotifyTradeOpened,
  shouldStartNewRfq,
  threadSinceNewTrade,
  waitingIndicationReply,
} from "@/lib/whatsapp/rfq-collect-logic";

describe("buyerPhaseFromStatus", () => {
  it("parks RFQ intake after the Trade ID is issued", () => {
    assert.equal(buyerPhaseFromStatus("collecting"), "rfq");
    assert.equal(buyerPhaseFromStatus("open"), "waiting_indication");
    assert.equal(buyerPhaseFromStatus("rfq_sent"), "waiting_indication");
    assert.equal(buyerPhaseFromStatus("awaiting_desk"), "waiting_indication");
    assert.equal(buyerPhaseFromStatus("firm_interest"), "post_yes");
  });
});

describe("isCourtesyMessage", () => {
  it("treats thanks and okay as courtesy, not a product", () => {
    assert.equal(isCourtesyMessage("Okay Thanks"), true);
    assert.equal(isCourtesyMessage("thanks"), true);
    assert.equal(isCourtesyMessage("ok"), true);
    assert.equal(isCourtesyMessage("Noni44"), false);
    assert.equal(isCourtesyMessage("Need a new order"), false);
  });
});

describe("bindInboundToTrade", () => {
  it("keeps Okay Thanks on the live Trade ID after fan-out", () => {
    const bind = bindInboundToTrade({
      text: "Okay Thanks",
      latestStatus: "rfq_sent",
      latestProduct: "Noni44",
    });
    assert.equal(bind.kind, "courtesy");
    assert.equal(bind.startNew, false);
    assert.equal(bind.phase, "waiting_indication");
    assert.match(waitingIndicationReply("rfq#092", "Noni44"), /rfq#092/);
  });

  it("starts a new collecting RFQ only for a different product or new-order phrase", () => {
    assert.equal(
      bindInboundToTrade({
        text: "Need a new order",
        latestStatus: "rfq_sent",
        latestProduct: "Noni44",
      }).startNew,
      true,
    );
    assert.equal(
      bindInboundToTrade({
        text: "Uranium XL",
        latestStatus: "firm_interest",
        latestProduct: "Noni44",
      }).startNew,
      true,
    );
    assert.equal(
      bindInboundToTrade({
        text: "Okay Thanks",
        latestStatus: "rfq_sent",
        latestProduct: "Noni44",
        geminiKind: "new_trade",
      }).startNew,
      false,
    );
  });

  it("does not let Gemini call a product name courtesy", () => {
    const bind = bindInboundToTrade({
      text: "Uranium XL",
      latestStatus: "rfq_sent",
      latestProduct: "Noni44",
      geminiKind: "courtesy",
    });
    assert.equal(bind.startNew, true);
    assert.equal(bind.kind, "new_trade");
  });

  it("starts a new collecting RFQ when they ask for a new request on a leftover draft", () => {
    assert.equal(
      bindInboundToTrade({
        text: "i need a new request",
        latestStatus: "collecting",
        latestProduct: "Dwell",
      }).startNew,
      true,
    );
  });

  it("lets Gemini mark a real new trade when the line is not courtesy", () => {
    const bind = bindInboundToTrade({
      text: "can we look at DAP as well",
      latestStatus: "rfq_sent",
      latestProduct: "Noni44",
      geminiKind: "new_trade",
    });
    assert.equal(bind.startNew, true);
    assert.equal(bind.kind, "new_trade");
  });
});

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
        latestProduct: "Dwell",
      }),
      false,
    );
    assert.equal(
      shouldStartNewRfq({
        text: "Lagos",
        latestStatus: "collecting",
        latestProduct: "Dwell",
        requestedPhase: "rfq",
      }),
      false,
    );
  });

  it("does not start a new RFQ for the first enquiry", () => {
    assert.equal(shouldStartNewRfq({ text: "Urea", latestStatus: "" }), false);
  });

  it("does not start a new RFQ because receive passed phase rfq", () => {
    assert.equal(
      shouldStartNewRfq({
        text: "Okay Thanks",
        latestStatus: "rfq_sent",
        latestProduct: "Noni44",
        requestedPhase: "rfq",
      }),
      false,
    );
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
      route: "commercial_collect",
      reply: "Noted — packing stays bulk, as on the enquiry. How would you like to pay — LC at sight, SBLC, CAD, or TT?",
      extract: recap.extract,
      text: "Yes correct",
    });
    assert.equal(confirmed.route, "rfq_ready");
  });
});

describe("RFQ recap confirm", () => {
  const recap = [
    "Please confirm if the details for this enquiry are correct:",
    "• Product: Grannular VI",
    "• Quantity: 700 MT",
    "• Packing: Bulk",
    "• Incoterms/Port: FOB",
    "• Shipping: 4-week window",
  ].join("\n");

  it("reads the recap and treats yes as confirm, not payment", () => {
    const parsed = parseRfqRecap(recap);
    assert.equal(parsed.product, "Grannular VI");
    assert.equal(parsed.quantity_mt, "700");
    assert.equal(parsed.packing, "Bulk");
    assert.equal(parsed.incoterm_pref, "FOB");
    assert.equal(parsed.timing_notes, "4-week window");
    assert.equal(
      isRfqRecapConfirmTurn(
        [
          { direction: "in", body: "4weeks" },
          { direction: "out", body: recap },
        ],
        "yes",
      ),
      true,
    );
    assert.equal(isRfqRecapConfirm("Yes correct"), true);
    assert.equal(isRfqRecapConfirm("yes that's correct"), true);
    assert.equal(
      isRfqRecapConfirmTurn(
        [
          { direction: "out", body: recap },
        ],
        "Yes correct",
      ),
      true,
    );
    assert.equal(isRfqRecapConfirm("yes I need a new request"), false);
  });
});

describe("shouldNotifyTradeOpened", () => {
  it("sends one intent mail when the product is first named, not on later turns", () => {
    assert.equal(shouldNotifyTradeOpened("", "Dwell"), true);
    assert.equal(shouldNotifyTradeOpened("Dwell", "Dwell"), false);
    assert.equal(shouldNotifyTradeOpened("Dwell", "Uranium XL"), true);
    assert.equal(shouldNotifyTradeOpened("", "Dwell", true), false);
    assert.equal(shouldNotifyTradeOpened("", ""), false);
  });
});
