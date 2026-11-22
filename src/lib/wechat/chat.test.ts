import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GREETING, QUOTE_FORMAT, QUOTE_TYPE, WAIT_WEEKLY, millQuoteRecap, nextSupplierChat } from "@/lib/wechat/chat";

describe("millQuoteRecap", () => {
  test("shows the trade and the mill price before submit", () => {
    const recap = millQuoteRecap(
      {
        rfq_id: "rfq#086",
        product_name: "Hilloport (High-qual",
        specification: "",
        unit_price: "4600",
        currency: "USD",
        quantity: "400",
        packaging: "50kg bags",
        destination: "Apapa port",
        load_port: "",
        origin: "",
        delivery_turnaround: "Within 2 weeks",
        incoterms: "CIF",
        validity: "",
        raw_body: "4600usd",
      },
      "rfq#086",
    );
    assert.match(recap, /Please confirm this quote for rfq#086/);
    assert.match(recap, /Product: Hilloport/);
    assert.match(recap, /Quantity: 400 MT/);
    assert.match(recap, /Your price: USD 4600\/MT/);
    assert.match(recap, /Reply YES to submit/);
  });
});

describe("nextSupplierChat", () => {
  test("greets on Hi when the conversation is new", () => {
    const turn = nextSupplierChat({ stage: "", text: "Hi" });
    assert.equal(turn.nextStage, "ask_quote_intent");
    assert.equal(turn.reply, GREETING);
  });

  test("asks new or previous after yes", () => {
    const turn = nextSupplierChat({ stage: "ask_quote_intent", text: "yes" });
    assert.equal(turn.reply, QUOTE_TYPE);
    assert.equal(turn.nextStage, "ask_quote_type");
  });

  test("does not treat waiting for the weekly broadcast as a no-quote", () => {
    const turn = nextSupplierChat({
      stage: "ask_quote_intent",
      text: "Yes, I have a weekly broadcast but I will wait till you send me the weekly broadcast update",
    });
    assert.equal(turn.reply, WAIT_WEEKLY);
    assert.equal(turn.nextStage, "");
  });

  test("does not greet again after the first ask", () => {
    const turn = nextSupplierChat({ stage: "ask_quote_intent", text: "Hi" });
    assert.equal(turn.reply, QUOTE_FORMAT);
  });

  test("recaps a bare price against the open RFQ instead of greeting or saving", () => {
    const turn = nextSupplierChat({
      stage: "awaiting_previous_quote",
      confirmedRfqId: "rfq#089",
      text: "1000",
    });
    assert.match(turn.reply, /Please confirm this quote for rfq#089/i);
    assert.match(turn.reply, /Your price: USD 1000\/MT/i);
    assert.match(turn.reply, /Reply YES to submit/i);
    assert.equal(turn.nextStage, "awaiting_quote_confirm");
  });

  test("treats YES on the mill recap as submit, not a new greeting", () => {
    const turn = nextSupplierChat({
      stage: "awaiting_quote_confirm",
      confirmedRfqId: "rfq#086",
      text: "YES",
    });
    assert.match(turn.reply, /submitted/i);
    assert.equal(turn.nextStage, "awaiting_origin_port");
  });

  test("asks origin and load port again instead of greeting", () => {
    const turn = nextSupplierChat({
      stage: "awaiting_origin_port",
      confirmedRfqId: "rfq#089",
      text: "ok",
    });
    assert.match(turn.reply, /origin and load port for rfq#089/i);
    assert.equal(turn.nextStage, "awaiting_origin_port");
  });

  test("asks for the USD price when the RFQ reply is unclear", () => {
    const turn = nextSupplierChat({
      stage: "awaiting_previous_quote",
      confirmedRfqId: "rfq#089",
      text: "ok",
    });
    assert.match(turn.reply, /unit price in USD\/MT for rfq#089/i);
    assert.equal(turn.nextStage, "rfq_followup");
  });
});
