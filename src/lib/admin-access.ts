import type { SessionUser } from "@/lib/session-shared";

const DEFAULT_ADMINS = ["kayode@aquifert.com"];

export function isAdminUser(user: (Pick<SessionUser, "email"> & Pick<Partial<SessionUser>, "admin">) | null): boolean {
  if (user?.admin) return true;
  if (!user?.email) return false;
  const configured = process.env.AQUIFERT_ADMIN_EMAILS?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const allow = configured && configured.length > 0 ? configured : DEFAULT_ADMINS;
  return allow.includes(user.email.toLowerCase());
}
