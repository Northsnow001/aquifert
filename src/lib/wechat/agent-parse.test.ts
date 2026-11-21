import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseJsonObject } from "@/lib/wechat/agent-parse";

describe("parseJsonObject", () => {
  test("strips fences around Gemini JSON", () => {
    const data = parseJsonObject('```json\n{"route":"chat","reply":"Hello"}\n```');
    assert.equal(data.route, "chat");
    assert.equal(data.reply, "Hello");
  });
});
