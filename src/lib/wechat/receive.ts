import "server-only";

import { parseWechatFollow } from "@/lib/trade/invite-rules";
import { getTradeSupplierByWechatOpenid, linkSupplierWechatFollow, logTradeMessage, setSupplierAwaitingReply } from "@/lib/trade/store";
import { nextSupplierChat } from "@/lib/wechat/chat";
import { parseWechatXml, wechatFollowEvent, wechatTextEvent, type WechatXmlEvent } from "@/lib/wechat/inbound";
import { sendWechatText } from "@/lib/wechat/send";

const LINKED =
  "You are now linked to Aquifert Ltd. Message us when you have a quote to share.\n\n您已绑定 Aquifert Ltd。如有报价，请直接在此发送。";

function joinedAt(seconds: string) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return new Date().toISOString();
  return new Date(n * 1000).toISOString();
}

async function handleFollow(event: WechatXmlEvent) {
  const parsed = parseWechatFollow({ openid: event.openid, eventKey: event.eventKey });
  if (!parsed.linked) {
    await logTradeMessage({
      direction: "in",
      channel: "wechat",
      fromAddress: event.openid,
      body: `WeChat ${event.event} with no invite email`,
      payload: { event: event.event, eventKey: event.eventKey },
    });
    return { kind: "follow" as const, linked: false };
  }
  const result = await linkSupplierWechatFollow({
    openid: parsed.openid,
    email: parsed.email,
    joinedAt: joinedAt(event.createTime),
  });
  if (result.ok && event.event === "subscribe") {
    await sendWechatText(parsed.openid, LINKED).catch(() => null);
  }
  return { kind: "follow" as const, linked: result.ok, unmatched: "unmatched" in result ? result.unmatched : false };
}

async function handleText(event: WechatXmlEvent) {
  const supplier = await getTradeSupplierByWechatOpenid(event.openid);
  await logTradeMessage({
    direction: "in",
    channel: "wechat",
    supplierId: supplier?.id,
    fromAddress: event.openid,
    body: event.content,
    payload: { msgType: "text" },
  });
  const turn = nextSupplierChat({ stage: supplier?.awaitingReply, text: event.content });
  const sent = await sendWechatText(event.openid, turn.reply);
  if (!sent.ok) {
    await logTradeMessage({
      direction: "out",
      channel: "wechat",
      supplierId: supplier?.id,
      toAddress: event.openid,
      body: turn.reply,
      payload: { stage: turn.nextStage, error: sent.error },
    });
    return { kind: "text" as const, millId: supplier?.id ?? null };
  }
  if (supplier) await setSupplierAwaitingReply(supplier.id, turn.nextStage);
  await logTradeMessage({
    direction: "out",
    channel: "wechat",
    supplierId: supplier?.id,
    toAddress: event.openid,
    body: turn.reply,
    payload: { stage: turn.nextStage },
  });
  return { kind: "text" as const, millId: supplier?.id ?? null };
}

export async function handleWechatXml(xml: string) {
  const event = parseWechatXml(xml);
  if (wechatFollowEvent(event)) return handleFollow(event);
  if (wechatTextEvent(event)) return handleText(event);
  return { kind: "ignored" as const, msgType: event.msgType, event: event.event };
}
