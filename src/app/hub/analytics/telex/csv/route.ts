import { routeAccess } from "@/app/hub/analytics/route-access";
import { csvResponse } from "@/components/hub/analytics/format";
import { filterTelex, parseTelexFilter, telexCsv } from "@/components/hub/analytics/telex-filter";
import { publishedTelex } from "@/lib/aq-modules/telex";
import { getHubContent } from "@/lib/hub-content";

export async function GET(request: Request) {
  const access = await routeAccess("aq-telex");
  if (access.denied) return access.denied;
  const filter = parseTelexFilter(Object.fromEntries(new URL(request.url).searchParams));
  const items = filterTelex(publishedTelex((await getHubContent()).telex, "all"), filter);
  const stamp = items[0]?.publishedAt.slice(0, 10) ?? "export";
  return csvResponse(telexCsv(items), `aquifert-telex-${stamp}.csv`);
}
