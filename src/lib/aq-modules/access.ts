import "server-only";

import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { getAqModules } from "@/lib/aq-modules/store";
import { canUse, unlockedModules, type ModuleKey } from "@/lib/aq-modules/types";
import { getSession } from "@/lib/session";

/** The signed-in member, whether they are an admin, and what their plan unlocks. */
export async function getHubAccess() {
  const user = await getSession();
  if (!user) redirect("/login");
  const modules = await getAqModules();
  const admin = isAdminUser(user);
  const viewer = { plan: user.plan, admin };
  return { user, admin, modules, unlocked: unlockedModules(modules.access, viewer), can: (key: ModuleKey) => canUse(modules.access, key, viewer) };
}
