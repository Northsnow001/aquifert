import "server-only";

import { recordBuyerInbound } from "@/lib/desk-hitl/store";
import { getTradeBuyerByWhatsApp, linkBuyerWhatsApp, logTradeMessage } from "@/lib/trade/store";
import { parseWhatsAppStart, toE164 } from "@/lib/whatsapp/parse";
import { runKnownBuyerTurn, runUnknownBuyerTurn, whatsappThread } from "@/lib/whatsapp/runner";
import { sendWhatsAppText } from "@/lib/whatsapp/send";

const LINKED =
  "You are now linked to Aquifert on WhatsApp. Send the product, quantity in MT, and destination when you have an enquiry.";

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

export async function handleWhatsAppInbound(input: { from: string; body: string; name?: string; deliver: boolean }) {
  const phone = toE164(input.from);
  const text = input.body.trim();
  if (!phone || !text) return { reply: "", buyerId: null as string | null };

  const start = parseWhatsAppStart(text);
  if (start.isStart && start.linkedEmail) {
    const linked = await linkBuyerWhatsApp({ phone, email: start.linkedEmail });
    await outbound(phone, linked.ok ? linked.buyer.id : null, LINKED, { event: "start", agent: "whatsapp-buyer-onboard" }, input.deliver);
    return { reply: LINKED, buyerId: linked.ok ? linked.buyer.id : null };
  }

  let buyer = await getTradeBuyerByWhatsApp(phone);
  await logTradeMessage({
    direction: "in",
    channel: "whatsapp",
    buyerId: buyer?.id,
    fromAddress: phone,
    body: text,
    payload: { msgType: "text" },
  });
  const messages = await whatsappThread(phone, buyer?.id);

  if (!buyer) {
    const turn = await runUnknownBuyerTurn({ phone, text, email: start.email, name: input.name, messages });
    await outbound(phone, turn.buyerId, turn.reply, { agent: turn.agent }, input.deliver);
    return { reply: turn.reply, buyerId: turn.buyerId };
  }

  const desk = await recordBuyerInbound({ phone, text, email: buyer.email }).catch(() => ({ event: "chat" as const }));
  if (desk && "status" in desk) {
    return { reply: "", buyerId: buyer.id, desk: true };
  }
  if (desk && "event" in desk && desk.event !== "chat") {
    return { reply: "", buyerId: buyer.id, desk: true };
  }

  const turn = await runKnownBuyerTurn({ buyer, text, messages });
  await outbound(phone, buyer.id, turn.reply, { agent: turn.agent, rfqCode: turn.rfqCode }, input.deliver);
  return { reply: turn.reply, buyerId: buyer.id };
}
