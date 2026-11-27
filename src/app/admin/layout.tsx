import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Aquifert Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login?redirect_to=/admin");
  if (!isAdminUser(user)) redirect("/hub");
  const jar = await cookies();
  return <AdminShell user={user} theme={parseTheme(jar.get(THEME_COOKIE)?.value)}>{children}</AdminShell>;
}
