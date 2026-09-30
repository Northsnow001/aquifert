import "server-only";

import { isAdminUser } from "@/lib/admin-access";
import { getAqModules } from "@/lib/aq-modules/store";
import { canUse, moduleInfo, PLAN_LABEL, type ModuleKey } from "@/lib/aq-modules/types";
import { getSession } from "@/lib/session";

/** Route handlers cannot render the locked screen, so they answer with a plain status instead. */
export async function routeAccess(key: ModuleKey) {
  const user = await getSession();
  if (!user) return { denied: new Response("Sign in to download this file.", { status: 401 }) } as const;
  const modules = await getAqModules();
  if (!canUse(modules.access, key, { plan: user.plan, admin: isAdminUser(user) })) {
    return { denied: new Response(`${moduleInfo(key).label} is included from the ${PLAN_LABEL[modules.access[key]]} plan.`, { status: 403 }) } as const;
  }
  return { denied: null, user, modules } as const;
}
