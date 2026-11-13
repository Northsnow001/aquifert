import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-access";
import { readFoAttachmentFile } from "@/lib/desk-hitl/fo-pack";
import { getDeskDeal } from "@/lib/desk-hitl/store";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, fileId } = await params;
  const deal = await getDeskDeal(id);
  const file = deal?.foPack?.attachments.find((row) => row.id === fileId);
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  const bytes = await readFoAttachmentFile(file);
  if (!bytes) return NextResponse.json({ error: "File missing from storage." }, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${file.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
