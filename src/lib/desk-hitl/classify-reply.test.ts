import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyBuyerReply, parseReplyIntent } from "@/lib/desk-hitl/logic";

describe("parseReplyIntent", () => {
  it("reads agree from JSON", () => {
    assert.equal(parseReplyIntent('{"intent":"agree"}'), "agree");
    assert.equal(parseReplyIntent('{"intent":"yes"}'), "agree");
  });

  it("reads negotiate and chat", () => {
    assert.equal(parseReplyIntent('{"intent":"negotiate"}'), "negotiate");
    assert.equal(parseReplyIntent("```json\n{\"kind\":\"chat\"}\n```"), "chat");
  });

  it("returns null when Gemini is unclear", () => {
    assert.equal(parseReplyIntent("not sure"), null);
    assert.equal(parseReplyIntent("{"), null);
  });
});

describe("keyword path stays first", () => {
  it("does not need Gemini for obvious yes or NeoGuard", () => {
    assert.equal(classifyBuyerReply("go ahead"), "agree");
    assert.equal(classifyBuyerReply("NeoGuard"), "chat");
    assert.equal(classifyBuyerReply("Hi"), "chat");
  });
});
