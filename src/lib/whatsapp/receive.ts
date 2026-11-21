import "server-only";

import { recordBuyerInbound } from "@/lib/desk-hitl/store";
import { getTradeBuyerByWhatsApp, linkBuyerWhatsApp, logTradeMessage } from "@/lib/trade/store";
import type { TradeBuyer } from "@/lib/trade/types";
import { identityFromBuyer } from "@/lib/whatsapp/buyer-identity";
import { parseWhatsAppStart, toE164 } from "@/lib/whatsapp/parse";
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
  const messages = await whatsappThread(input.phone, input.buyer.id);
  const gaps = identityFromBuyer(input.buyer);
  if (gaps.missing.length) {
    const turn = await runInvitedBuyerTurn({
      buyer: input.buyer,
      text: input.text,
      name: input.name,
      messages,
    });
    await outbound(input.phone, turn.buyer.id, turn.reply, { agent: turn.agent, complete: turn.complete }, input.deliver);
    return { reply: turn.reply, buyerId: turn.buyer.id };
  }

  if (input.justLinked) {
    const reply = `Hi ${input.buyer.contactName || input.buyer.companyName} — good to continue here. What fertiliser are you looking to cover?`;
    await outbound(input.phone, input.buyer.id, reply, { event: "start", agent: "whatsapp-buyer-desk" }, input.deliver);
    return { reply, buyerId: input.buyer.id };
  }

  const desk = await recordBuyerInbound({ phone: input.phone, text: input.text, email: input.buyer.email }).catch(() => ({ event: "chat" as const }));
  if (desk && "status" in desk) return { reply: "", buyerId: input.buyer.id, desk: true };
  if (desk && "event" in desk && desk.event !== "chat") return { reply: "", buyerId: input.buyer.id, desk: true };

  const turn = await runKnownBuyerTurn({ buyer: input.buyer, text: input.text, messages });
  await outbound(input.phone, input.buyer.id, turn.reply, { agent: turn.agent, rfqCode: turn.rfqCode }, input.deliver);
  return { reply: turn.reply, buyerId: input.buyer.id };
}

export async function handleWhatsAppInbound(input: { from: string; body: string; name?: string; deliver: boolean }) {
  const phone = toE164(input.from);
  const text = input.body.trim();
  if (!phone || !text) return { reply: "", buyerId: null as string | null };

  const start = parseWhatsAppStart(text);
  let buyer = await getTradeBuyerByWhatsApp(phone);
  let justLinked = false;
  if (!buyer) {
    const linked = await tryLink(phone, start.linkedEmail || start.email);
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

  if (!buyer) {
    const messages = await whatsappThread(phone, null);
    const turn = await runUnknownBuyerTurn({ phone, text, email: start.email, name: input.name, messages });
    await outbound(phone, turn.buyerId, turn.reply, { agent: turn.agent }, input.deliver);
    return { reply: turn.reply, buyerId: turn.buyerId };
  }

  return continueKnown({ buyer, phone, text, name: input.name, deliver: input.deliver, justLinked });
}
