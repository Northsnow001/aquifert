import { NextResponse, type NextRequest } from "next/server";
import { parseSupplierRegistration } from "@/lib/suppliers/registration";

const DEFAULT_WEBHOOK = "https://northsnow.app.n8n.cloud/webhook/wechat";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid form" }, { status: 400 });

  // Bots fill the hidden "website" field; people never see it.
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });

  const parsed = parseSupplierRegistration(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const secret = process.env.N8N_SUPPLIER_WEBHOOK_SECRET;
  try {
    const res = await fetch(process.env.N8N_SUPPLIER_WEBHOOK_URL || DEFAULT_WEBHOOK, {
      method: "POST",
      headers: { "content-type": "application/json", ...(secret ? { "x-aquifert-secret": secret } : {}) },
      // The same n8n webhook also receives WeChat's XML; "source" lets it route form rows separately.
      body: JSON.stringify({ source: "supplier_form", ...parsed.value }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`n8n answered ${res.status}`);
  } catch (err) {
    console.error("[supplier-registration]", err);
    return NextResponse.json(
      { error: "We could not save your registration just now. Please try again in a minute." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, code: parsed.value.code });
}
