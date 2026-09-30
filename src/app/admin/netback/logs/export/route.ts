import { isAdminUser } from "@/lib/admin-access";
import { filterNetbackLogs, netbackLogsToCsv, readNetbackFilters } from "@/lib/netback-desk/logs";
import { listNetbackLogs } from "@/lib/netback-desk/store";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return new Response("Sign in as an admin.", { status: 401 });
  const filters = readNetbackFilters(Object.fromEntries(new URL(request.url).searchParams));
  const csv = netbackLogsToCsv(filterNetbackLogs(await listNetbackLogs(), filters));
  const name = `netback-calculations${filters.month ? `-${filters.month}` : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(`\uFEFF${csv}`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" },
  });
}
