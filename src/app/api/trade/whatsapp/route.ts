import { after, NextResponse, type NextRequest } from "next/server";
import { deskUsesAgent, forwardToN8n, n8nWhatsAppInboundUrl } from "@/lib/desk-engine";
import { deskHitlAuthorized } from "@/lib/desk-hitl/n8n-auth";
import { handleWhatsAppInbound } from "@/lib/whatsapp/receive";

export const runtime = "nodejs";
export const maxDuration = 60;

function twiml(body = "") {
  const inner = body ? `<Message>${escapeXml(body)}</Message>` : "";
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function parseInbound(req: NextRequest) {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await req.formData();
    return {
      from: String(form.get("From") || ""),
      body: String(form.get("Body") || ""),
      name: String(form.get("ProfileName") || ""),
      waId: String(form.get("WaId") || ""),
      to: String(form.get("To") || ""),
      messageSid: String(form.get("MessageSid") || form.get("SmsSid") || ""),
      twilio: true,
    };
  }
  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  return {
    from: String(json?.from ?? json?.phone ?? json?.From ?? ""),
    body: String(json?.body ?? json?.text ?? json?.Body ?? ""),
    name: String(json?.name ?? json?.ProfileName ?? ""),
    waId: "",
    to: "",
    messageSid: "",
    twilio: false,
  };
}

/** Twilio WhatsApp inbound, or n8n JSON { phone, text }. Point Twilio → https://www.aquifert.com/api/trade/whatsapp */
export async function POST(req: NextRequest) {
  const inbound = await parseInbound(req);
  if (!inbound.twilio && !deskHitlAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!deskUsesAgent("whatsapp")) {
    if (inbound.twilio) {
      const payload = JSON.stringify({
        Body: inbound.body,
        From: inbound.from,
        ProfileName: inbound.name,
        WaId: inbound.waId,
        To: inbound.to,
        MessageSid: inbound.messageSid,
      });
      after(async () => {
        try {
          await forwardToN8n(n8nWhatsAppInboundUrl(), payload, "application/json");
        } catch (error) {
          console.error("[n8n whatsapp]", error instanceof Error ? error.message : error);
        }
      });
      return twiml();
    }
    return NextResponse.json({ ok: true, engine: "n8n" });
  }
  if (inbound.twilio) {
    after(async () => {
      try {
        await handleWhatsAppInbound({ from: inbound.from, body: inbound.body, name: inbound.name, deliver: true });
      } catch {
        // Ack already sent.
      }
    });
    return twiml();
  }
  const result = await handleWhatsAppInbound({
    from: inbound.from,
    body: inbound.body,
    name: inbound.name,
    deliver: Boolean(process.env.TWILIO_ACCOUNT_SID),
  });
  return NextResponse.json({ ok: true, reply: result.reply, buyerId: result.buyerId });
}
