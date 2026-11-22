import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GREETING, QUOTE_FORMAT, QUOTE_TYPE, WAIT_WEEKLY, nextSupplierChat } from "@/lib/wechat/chat";

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

  test("records a bare price against the open RFQ instead of greeting", () => {
    const turn = nextSupplierChat({
      stage: "awaiting_previous_quote",
      confirmedRfqId: "rfq#089",
      text: "1000",
    });
    assert.match(turn.reply, /USD 1000\/MT for rfq#089/i);
    assert.match(turn.reply, /origin and load port/i);
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
