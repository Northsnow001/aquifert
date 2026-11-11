import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-access";
import { getDeskDeal } from "@/lib/desk-hitl/store";
import { salesContractFromPi } from "@/lib/firm-order/from-deal";
import { buildFirmOrderPdf, firmOrderFilename } from "@/lib/firm-order/pdf";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const deal = await getDeskDeal(id);
  if (!deal?.pi) return NextResponse.json({ error: "No proforma on this deal." }, { status: 404 });
  const order = salesContractFromPi(deal.pi.order);
  const bytes = await buildFirmOrderPdf(order);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${firmOrderFilename(order)}"`,
      "Cache-Control": "no-store",
    },
  });
}
