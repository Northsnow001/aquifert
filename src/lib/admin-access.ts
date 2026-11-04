import type { SessionUser } from "@/lib/session-shared";

const DEFAULT_ADMINS = ["kayode@aquifert.com"];

function extraAdminEmails() {
  return process.env.AQUIFERT_ADMIN_EMAILS?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) ?? [];
}

/** Addresses that are always admin (code defaults plus AQUIFERT_ADMIN_EMAILS). They cannot be demoted from the members page. */
export function allowlistedAdminEmails() {
  return [...new Set([...DEFAULT_ADMINS, ...extraAdminEmails()])];
}

export function isAllowlistedAdminEmail(email: string | null | undefined) {
  return Boolean(email && allowlistedAdminEmails().includes(email.toLowerCase()));
}

export function isAdminUser(user: (Pick<SessionUser, "email"> & Pick<Partial<SessionUser>, "admin">) | null): boolean {
  if (user?.admin) return true;
  if (!user?.email) return false;
  return isAllowlistedAdminEmail(user.email);
}
