import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/hub/app-shell";
import { SuspendedNotice } from "@/components/hub/suspended-notice";
import { isAdminUser } from "@/lib/admin-access";
import { getSessionAccess } from "@/lib/session";

export const metadata: Metadata = {
  title: "Aquifert ONE",
  robots: { index: false, follow: false },
};

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const { user, ban } = await getSessionAccess();
  if (!user) redirect("/login");
  if (ban) return <SuspendedNotice email={user.email} />;
  return <AppShell user={user} admin={isAdminUser(user)}>{children}</AppShell>;
}
