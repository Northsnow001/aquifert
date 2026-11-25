import "server-only";

import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { hasAqAnalytics } from "@/lib/aq-analytics-access";
import { getPrefs } from "@/lib/aq-modules/members";
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

/** The AQ Analytics desk. Opens after the membership is active, including an admin mock subscription. */
export async function requireAqAnalytics(fallback: string) {
  const user = await getSession();
  if (!user) redirect(fallback);
  const prefs = await getPrefs(user);
  if (!hasAqAnalytics({ plan: user.plan, mockPlan: prefs.mockPlan })) redirect(fallback);
  return user;
}
