import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-access";
import { getDeskDeal } from "@/lib/desk-hitl/store";
import { buildFirmOrderPdf, firmOrderFilename } from "@/lib/firm-order/pdf";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

/** Live PDF from the stored PI draft (after Matt’s edits). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const deal = await getDeskDeal(id);
  if (!deal?.pi) return NextResponse.json({ error: "No proforma on this deal." }, { status: 404 });
  const bytes = await buildFirmOrderPdf(deal.pi.order);
  const filename = firmOrderFilename(deal.pi.order);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
