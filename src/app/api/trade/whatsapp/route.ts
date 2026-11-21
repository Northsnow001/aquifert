import { after, NextResponse, type NextRequest } from "next/server";
import { deskHitlAuthorized } from "@/lib/desk-hitl/n8n-auth";
import { handleWhatsAppInbound } from "@/lib/whatsapp/receive";

export const runtime = "nodejs";

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
      twilio: true,
    };
  }
  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  return {
    from: String(json?.from ?? json?.phone ?? json?.From ?? ""),
    body: String(json?.body ?? json?.text ?? json?.Body ?? ""),
    name: String(json?.name ?? json?.ProfileName ?? ""),
    twilio: false,
  };
}

/** Twilio WhatsApp inbound, or n8n JSON { phone, text }. Point Twilio → https://www.aquifert.com/api/trade/whatsapp */
export async function POST(req: NextRequest) {
  const inbound = await parseInbound(req);
  if (!inbound.twilio && !deskHitlAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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
