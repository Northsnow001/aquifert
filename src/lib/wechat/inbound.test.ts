import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, test } from "node:test";
import { parseWechatXml, wechatFollowEvent, wechatSignatureMatches, wechatTextEvent } from "@/lib/wechat/inbound";

describe("wechatSignatureMatches", () => {
  test("matches the WeChat SHA1 token check", () => {
    const token = "aquifert";
    const timestamp = "1700000000";
    const nonce = "nonce1";
    const signature = createHash("sha1").update([token, timestamp, nonce].sort().join("")).digest("hex");
    assert.equal(wechatSignatureMatches({ token, timestamp, nonce, signature }), true);
    assert.equal(wechatSignatureMatches({ token, timestamp, nonce, signature: "deadbeef" }), false);
  });
});

describe("parseWechatXml", () => {
  test("reads a subscribe event with qrscene email", () => {
    const xml = `<xml>
<ToUserName><![CDATA[gh_oa]]></ToUserName>
<FromUserName><![CDATA[ovABC]]></FromUserName>
<CreateTime>1700000000</CreateTime>
<MsgType><![CDATA[event]]></MsgType>
<Event><![CDATA[subscribe]]></Event>
<EventKey><![CDATA[qrscene_deji@mill.com]]></EventKey>
</xml>`;
    const event = parseWechatXml(xml);
    assert.equal(event.openid, "ovABC");
    assert.equal(event.event, "subscribe");
    assert.equal(event.eventKey, "qrscene_deji@mill.com");
    assert.equal(wechatFollowEvent(event), true);
  });

  test("reads a supplier text message", () => {
    const xml = `<xml>
<FromUserName><![CDATA[ovABC]]></FromUserName>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[rfq#066 Urea 380]]></Content>
</xml>`;
    const event = parseWechatXml(xml);
    assert.equal(event.content, "rfq#066 Urea 380");
    assert.equal(wechatTextEvent(event), true);
  });
});
