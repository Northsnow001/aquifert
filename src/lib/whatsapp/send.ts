import "server-only";

import { deskWhatsAppE164 } from "@/lib/whatsapp/parse";

export async function sendWhatsAppText(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = deskWhatsAppE164();
  const dest = to.replace(/^whatsapp:/i, "").trim();
  if (!sid || !token) return { ok: false as const, error: "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are not set." };
  if (!dest) return { ok: false as const, error: "Missing WhatsApp number." };

  const params = new URLSearchParams({
    From: `whatsapp:${from}`,
    To: dest.startsWith("whatsapp:") ? dest : `whatsapp:${dest.startsWith("+") ? dest : "+" + dest.replace(/\D/g, "")}`,
    Body: body,
  });
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as { message?: string } | null;
    return { ok: false as const, error: json?.message || `Twilio HTTP ${response.status}` };
  }
  return { ok: true as const };
}
