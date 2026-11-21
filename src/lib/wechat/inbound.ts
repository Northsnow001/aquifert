import { createHash, timingSafeEqual } from "node:crypto";

export type WechatXmlEvent = {
  toUser: string;
  openid: string;
  createTime: string;
  msgType: string;
  event: string;
  eventKey: string;
  content: string;
};

export function xmlTag(xml: string, tag: string) {
  const re = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i");
  return (xml.match(re)?.[1] ?? "").trim();
}

export function parseWechatXml(xml: string): WechatXmlEvent {
  return {
    toUser: xmlTag(xml, "ToUserName"),
    openid: xmlTag(xml, "FromUserName"),
    createTime: xmlTag(xml, "CreateTime"),
    msgType: xmlTag(xml, "MsgType").toLowerCase(),
    event: xmlTag(xml, "Event").toLowerCase(),
    eventKey: xmlTag(xml, "EventKey"),
    content: xmlTag(xml, "Content"),
  };
}

export function wechatSignatureMatches(input: { token: string; timestamp: string; nonce: string; signature: string }) {
  const token = input.token.trim();
  const timestamp = String(input.timestamp ?? "");
  const nonce = String(input.nonce ?? "");
  const signature = String(input.signature ?? "").toLowerCase();
  if (!token || !timestamp || !nonce || !signature) return false;
  const expected = createHash("sha1").update([token, timestamp, nonce].sort().join("")).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function wechatFollowEvent(event: WechatXmlEvent) {
  return event.msgType === "event" && (event.event === "subscribe" || event.event === "scan");
}

export function wechatTextEvent(event: WechatXmlEvent) {
  return event.msgType === "text" && Boolean(event.content);
}
