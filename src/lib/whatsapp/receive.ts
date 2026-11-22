import "server-only";

import { isIndicationAsk } from "@/lib/desk-hitl/logic";
import { bindInboundToTrade, isRfqRecapMessage, lastAgentText } from "@/lib/whatsapp/rfq-collect-logic";
import { buyerHasLiveDeskThread, markWhatsAppSent, recordBuyerInbound } from "@/lib/desk-hitl/store";
import { isNewBuyerConversation } from "@/lib/trade/admin-alert-logic";
import { notifyBuyerConversationStarted } from "@/lib/trade/admin-alerts";
import {
  getLatestBuyerRfq,
  getTradeBuyerByWhatsApp,
  linkBuyerWhatsApp,
  linkBuyerWhatsAppFromHello,
  listOrphanWhatsAppThread,
  listTradeThread,
  logTradeMessage,
  markBuyerOnWhatsApp,
} from "@/lib/trade/store";
import type { TradeBuyer } from "@/lib/trade/types";
import { identityFromBuyer } from "@/lib/whatsapp/buyer-identity";
import { parseInviteHello, parseWhatsAppStart, toE164 } from "@/lib/whatsapp/parse";
import { fanOutBuyerRfq } from "@/lib/wechat/fanout";
import { runInvitedBuyerTurn, runKnownBuyerTurn, runUnknownBuyerTurn, whatsappThread } from "@/lib/whatsapp/runner";
import { sendWhatsAppText } from "@/lib/whatsapp/send";

async function outbound(phone: string, buyerId: string | null | undefined, body: string, payload: Record<string, unknown>, deliver: boolean) {
  if (deliver) await sendWhatsAppText(phone, body).catch(() => ({ ok: false }));
  await logTradeMessage({
    direction: "out",
    channel: "whatsapp",
    buyerId: buyerId || undefined,
    toAddress: phone,
    body,
    payload,
  });
}

async function tryLink(phone: string, email: string) {
  if (!email.includes("@")) return null;
  const linked = await linkBuyerWhatsApp({ phone, email }).catch(() => null);
  return linked && linked.ok ? linked.buyer : null;
}

async function continueKnown(input: {
  buyer: TradeBuyer;
  phone: string;
  text: string;
  name?: string;
  deliver: boolean;
  justLinked?: boolean;
}) {
  const buyer =
    input.buyer.onboardingStatus === "subscribed" && input.buyer.whatsappE164 === input.phone
      ? input.buyer
      : await markBuyerOnWhatsApp(input.buyer.id, input.phone).catch(() => input.buyer);
  const messages = await whatsappThread(input.phone, buyer.id);
  const latest = await getLatestBuyerRfq(buyer.id).catch(() => null);
  const recentInbound = messages.filter((row) => row.direction === "in").slice(-8).map((row) => row.body);
  const bind = bindInboundToTrade({
    text: input.text,
    recentInbound,
    latestStatus: latest ? String(latest.status || "") : "",
    latestProduct: latest ? String(latest.product_label || "") : "",
  });
  const startingNew = bind.startNew;
  if (isRfqRecapMessage(lastAgentText(messages)) && !startingNew) {
    const turn = await runKnownBuyerTurn({ buyer, text: input.text, messages, phase: "rfq" });
    await outbound(input.phone, buyer.id, turn.reply, { agent: turn.agent, rfqCode: turn.rfqCode, route: turn.route }, input.deliver);
    if (turn.fanout && turn.rfqId) {
      await fanOutBuyerRfq(turn.rfqId).catch((error) => {
        console.error("[rfq fan-out]", error instanceof Error ? error.message : error);
      });
    }
    return { reply: turn.reply, buyerId: buyer.id };
  }
  const desk = await recordBuyerInbound({
    phone: input.phone,
    text: input.text,
    email: buyer.email,
    requestId: startingNew ? undefined : latest?.code ? String(latest.code) : undefined,
  }).catch(() => ({ event: "chat" as const }));
  const newRfqPhase = startingNew;
  if (desk && "messages" in desk && !newRfqPhase) {
    const queued = desk.messages.filter((row) => {
      if (row.from !== "desk" || row.outboundStatus !== "queued") return false;
      if (desk.status === "firm_interest" && isIndicationAsk(row.text)) return false;
      return true;
    });
    for (const msg of queued) {
      await outbound(input.phone, buyer.id, msg.text, { event: "desk", dealId: desk.id }, input.deliver);
      await markWhatsAppSent(desk.id, msg.id).catch(() => null);
    }
    if (queued.length || (desk.status === "negotiating" && desk.mattThread) || desk.status === "firm_interest") {
      const lastDesk = [...desk.messages].reverse().find((row) => row.from === "desk");
      return { reply: queued.at(-1)?.text || lastDesk?.text || "", buyerId: buyer.id, desk: true };
    }
  }
  const fo =
    !newRfqPhase &&
    ((desk && "event" in desk && desk.event === "firm_interest") ||
      (desk && "status" in desk && desk.status === "firm_interest" && !desk.mattThread));
  if (fo) {
    const turn = await runKnownBuyerTurn({ buyer, text: input.text, messages, phase: "post_yes" });
    await outbound(input.phone, buyer.id, turn.reply, { agent: turn.agent, route: turn.route, rfqCode: turn.rfqCode }, input.deliver);
    return { reply: turn.reply, buyerId: buyer.id, desk: true };
  }
  if (desk && "event" in desk && desk.event !== "chat") return { reply: "", buyerId: buyer.id, desk: true };

  const gaps = identityFromBuyer(buyer);
  if (gaps.missing.length) {
    const turn = await runInvitedBuyerTurn({
      buyer,
      text: input.text,
      name: input.name,
      messages,
    });
    await outbound(input.phone, turn.buyer.id, turn.reply, { agent: turn.agent, complete: turn.complete }, input.deliver);
    return { reply: turn.reply, buyerId: turn.buyer.id };
  }

  if (input.justLinked) {
    const reply = `Hi ${buyer.contactName || buyer.companyName} — good to continue here. What fertiliser are you looking to cover?`;
    await outbound(input.phone, buyer.id, reply, { event: "start", agent: "whatsapp-buyer-desk" }, input.deliver);
    return { reply, buyerId: buyer.id };
  }

  const turn = await runKnownBuyerTurn({
    buyer,
    text: input.text,
    messages,
    phase: startingNew ? "rfq" : bind.phase,
  });
  await outbound(input.phone, buyer.id, turn.reply, { agent: turn.agent, rfqCode: turn.rfqCode }, input.deliver);
  if (turn.fanout && turn.rfqId) {
    await fanOutBuyerRfq(turn.rfqId).catch((error) => {
      console.error("[rfq fan-out]", error instanceof Error ? error.message : error);
    });
  }
  return { reply: turn.reply, buyerId: buyer.id };
}

export async function handleWhatsAppInbound(input: { from: string; body: string; name?: string; deliver: boolean }) {
  const phone = toE164(input.from);
  const text = input.body.trim();
  if (!phone || !text) return { reply: "", buyerId: null as string | null };

  const start = parseWhatsAppStart(text);
  let buyer = await getTradeBuyerByWhatsApp(phone);
  let justLinked = false;
  if (!buyer) {
    const byEmail = await tryLink(phone, start.linkedEmail);
    const hello = parseInviteHello(text);
    const byHello =
      !byEmail && hello
        ? await linkBuyerWhatsAppFromHello({ phone, name: hello.name, company: hello.company }).catch(() => null)
        : null;
    const linked = byEmail ?? (byHello && byHello.ok ? byHello.buyer : null);
    if (linked) {
      buyer = linked;
      justLinked = true;
    }
  }

  if (!justLinked) {
    await logTradeMessage({
      direction: "in",
      channel: "whatsapp",
      buyerId: buyer?.id,
      fromAddress: phone,
      body: text,
      payload: { msgType: "text" },
    });
  }

  const thread = buyer
    ? await listTradeThread({ channel: "whatsapp", buyerId: buyer.id, address: phone }).catch(() => [])
    : await listOrphanWhatsAppThread(phone).catch(() => []);
  const liveDesk = await buyerHasLiveDeskThread(phone).catch(() => false);
  if (!liveDesk && isNewBuyerConversation(thread)) {
    await notifyBuyerConversationStarted({
      buyer: buyer?.contactName || input.name || phone,
      company: buyer?.companyName,
      phone,
      message: text,
      buyerId: buyer?.id,
    }).catch(() => undefined);
  }

  if (!buyer) {
    const messages = await listOrphanWhatsAppThread(phone).catch(() => []);
    const turn = await runUnknownBuyerTurn({ phone, text, name: input.name, messages });
    await outbound(phone, turn.buyerId, turn.reply, { agent: turn.agent }, input.deliver);
    return { reply: turn.reply, buyerId: turn.buyerId };
  }

  return continueKnown({ buyer, phone, text, name: input.name, deliver: input.deliver, justLinked });
}
