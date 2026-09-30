import { isAdminUser } from "@/lib/admin-access";
import { filterLogs, logsToCsv, readLogFilters } from "@/lib/freight-desk/logs";
import { listCalcLogs } from "@/lib/freight-desk/store";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return new Response("Sign in as an admin.", { status: 401 });
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filters = readLogFilters(params);
  const csv = logsToCsv(filterLogs(await listCalcLogs(), filters));
  const name = `freight-calculations${filters.month ? `-${filters.month}` : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(`\uFEFF${csv}`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" },
  });
}
