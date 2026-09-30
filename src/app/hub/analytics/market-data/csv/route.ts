import { routeAccess } from "@/app/hub/analytics/route-access";
import { csvResponse } from "@/components/hub/analytics/format";
import { dataAsOf, toCsv } from "@/lib/aq-modules/signal";

export async function GET() {
  const access = await routeAccess("market-data");
  if (access.denied) return access.denied;
  const { series } = access.modules;
  return csvResponse(toCsv(series), `aquifert-market-data-${dataAsOf(series) ?? "latest"}.csv`);
}
