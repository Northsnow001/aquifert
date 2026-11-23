import "server-only";

import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";

/**
 * AQ Trade and the freight analytics preview stay with admins until a
 * subscription opens them to members.
 */
export async function aqPreviewAccess() {
  const user = await getSession();
  return { user, allowed: isAdminUser(user) };
}

export async function requireAqPreview(fallback: string) {
  const access = await aqPreviewAccess();
  if (!access.allowed) redirect(fallback);
  return access.user;
}
