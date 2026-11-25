import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-access";
import { filterInquiries, listInquiries } from "@/lib/desk-inquiries/model";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const COLUMNS = ["ref", "at", "source", "channel", "buyerName", "company", "contact", "product", "grade", "quantity", "packaging", "incoterm", "destination", "window", "targetPrice", "payment", "quotes", "completeness", "status"] as const;

function csv(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return new NextResponse("Sign in as an admin.", { status: 401 });
  const url = new URL(request.url);
  const rows = filterInquiries(await listInquiries(), {
    view: url.searchParams.get("view") ?? undefined,
    tab: url.searchParams.get("tab") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  const body = [COLUMNS.join(","), ...rows.map((row) => COLUMNS.map((key) => csv(row[key])).join(","))].join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=inquiries.csv",
    },
  });
}
