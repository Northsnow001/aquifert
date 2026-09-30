import "server-only";

import { planLimit as aquibotLimit } from "@/lib/aquibot";
import type { AqModules } from "@/lib/aq-modules/types";
import { limitFor } from "@/lib/aq-modules/types";
import { getFreightDesk } from "@/lib/freight-desk/store";
import { planLimit as freightLimit } from "@/lib/freight-desk/types";
import { getHubContent } from "@/lib/hub-content";
import { getNetbackDesk } from "@/lib/netback-desk/store";
import { planLimit as netbackLimit } from "@/lib/netback-desk/types";
import type { Plan } from "@/lib/session-shared";
import { PLAN_ORDER, type Allowances } from "./shared";

/** Monthly allowances for every plan, read from the desks' own settings. */
export async function planAllowances(modules: AqModules): Promise<Record<Plan, Allowances>> {
  const [freight, netback, content] = await Promise.all([getFreightDesk(), getNetbackDesk(), getHubContent()]);
  return Object.fromEntries(
    PLAN_ORDER.map((plan) => [
      plan,
      {
        nitrogen: limitFor(modules.limits.nitrogenReports, plan),
        saved: limitFor(modules.limits.savedReports, plan),
        freight: freightLimit(freight.settings, plan),
        netback: netbackLimit(netback.settings, plan),
        aquibot: aquibotLimit(content.aquibot.settings, plan),
      },
    ]),
  ) as Record<Plan, Allowances>;
}
