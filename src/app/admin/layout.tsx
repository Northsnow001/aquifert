import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Aquifert Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminUser(user)) redirect("/hub");
  return <AdminShell user={user}>{children}</AdminShell>;
}
