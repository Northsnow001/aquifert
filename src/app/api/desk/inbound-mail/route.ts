import { NextResponse, type NextRequest } from "next/server";
import { deskHitlAuthorized } from "@/lib/desk-hitl/n8n-auth";
import { receiveMarketNote, receiveSupplierMail } from "@/lib/trade/inbound-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** n8n posts supplier or market mail: { from, subject, text, kind?: "supplier" | "market" }. */
export async function POST(req: NextRequest) {
  if (!deskHitlAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const from = typeof body?.from === "string" ? body.from : typeof body?.sender === "string" ? body.sender : "";
  const subject = typeof body?.subject === "string" ? body.subject : "";
  const text = typeof body?.text === "string" ? body.text : typeof body?.body === "string" ? body.body : "";
  if (!from.trim() || !text.trim()) return NextResponse.json({ ok: false, error: "Need from and text." }, { status: 400 });
  const kind = body?.kind === "market" ? "market" : "supplier";
  const saved = kind === "market" ? await receiveMarketNote({ from, subject, body: text }) : await receiveSupplierMail({ from, subject, body: text });
  return NextResponse.json({ ok: true, kind, id: saved.id, status: "status" in saved ? saved.status : "stored" });
}
