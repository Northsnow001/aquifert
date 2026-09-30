import type { NextRequest } from "next/server";
import { isAdminUser } from "@/lib/admin-access";
import { toCsv } from "@/lib/aq-modules/signal";
import { getAqModules } from "@/lib/aq-modules/store";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return new Response("Sign in as an admin.", { status: 401 });
  const { series } = await getAqModules();
  const id = request.nextUrl.searchParams.get("series");
  const picked = id ? series.filter((item) => item.id === id) : series;
  if (id && !picked.length) return new Response("That series no longer exists.", { status: 404 });
  const name = id ? `aquifert-${id.replace(/[^\w-]/g, "")}` : "aquifert-market-data";
  return new Response(`\uFEFF${toCsv(picked)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
