import "server-only";

import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { canSeeAqAnalytics } from "@/lib/aq-analytics-access";
import { getSession } from "@/lib/session";

/** AQ Trade stays with admins until a subscription opens it to members. */
export async function aqPreviewAccess() {
  const user = await getSession();
  return { user, allowed: isAdminUser(user) };
}

export async function requireAqPreview(fallback: string) {
  const access = await aqPreviewAccess();
  if (!access.allowed) redirect(fallback);
  return access.user;
}

/** The AQ Analytics desk tools. AQ Trade stays on the admin preview above. */
export async function requireAqAnalytics(fallback: string) {
  const user = await getSession();
  if (!user || !canSeeAqAnalytics({ plan: user.plan, admin: isAdminUser(user) })) redirect(fallback);
  return user;
}
