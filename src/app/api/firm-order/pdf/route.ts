import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { LIBRARY_BUCKET } from "@/lib/data/tables";
import { buildFirmOrderPdf, firmOrderFilename } from "@/lib/firm-order/pdf";
import { parseFirmOrder } from "@/lib/firm-order/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = process.env.FIRM_ORDER_PDF_SECRET?.trim();
  if (!secret) {
    // Local/dev convenience when secret is unset
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("x-firm-order-secret") || "";
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  return header === secret || bearer === secret;
}

async function maybeSignedUrl(bytes: Uint8Array, filename: string): Promise<string | null> {
  const db = createAdminClient();
  if (!db) return null;
  const id = randomUUID();
  const objectPath = `firm-orders/${id}/${filename}`;
  const { error } = await db.storage.from(LIBRARY_BUCKET).upload(objectPath, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) {
    console.error("[firm-order/pdf] storage upload failed", error.message);
    return null;
  }
  const { data, error: signError } = await db.storage.from(LIBRARY_BUCKET).createSignedUrl(objectPath, 60 * 60 * 48);
  if (signError || !data?.signedUrl) {
    console.error("[firm-order/pdf] signed URL failed", signError?.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * n8n True branch: POST firm_order JSON → Aquifert-branded PDF.
 * Auth: header `x-firm-order-secret` or `Authorization: Bearer` = FIRM_ORDER_PDF_SECRET.
 * Response JSON: { ok, filename, contentType, pdfBase64, pdfUrl }.
 * Optional `?binary=1` returns raw application/pdf.
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const order = parseFirmOrder(body);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Invalid firm_order payload (product required)." }, { status: 400 });
  }

  try {
    const bytes = await buildFirmOrderPdf(order);
    const filename = firmOrderFilename(order);
    const binary = req.nextUrl.searchParams.get("binary") === "1";

    if (binary) {
      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const pdfUrl = await maybeSignedUrl(bytes, filename);
    return NextResponse.json({
      ok: true,
      filename,
      contentType: "application/pdf",
      pdfBase64: Buffer.from(bytes).toString("base64"),
      pdfUrl,
      status: order.status,
    });
  } catch (err) {
    console.error("[firm-order/pdf]", err);
    return NextResponse.json({ ok: false, error: "Could not generate PDF." }, { status: 500 });
  }
}
