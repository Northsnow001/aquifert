import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GREETING, QUOTE_FORMAT, QUOTE_TYPE, nextSupplierChat } from "@/lib/wechat/chat";

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

  test("does not greet again after the first ask", () => {
    const turn = nextSupplierChat({ stage: "ask_quote_intent", text: "Hi" });
    assert.equal(turn.reply, QUOTE_FORMAT);
  });
});
