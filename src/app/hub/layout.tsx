import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/hub/app-shell";
import { SuspendedNotice } from "@/components/hub/suspended-notice";
import { isAdminUser } from "@/lib/admin-access";
import { getAqModules } from "@/lib/aq-modules/store";
import { unlockedModules } from "@/lib/aq-modules/types";
import { getSessionAccess } from "@/lib/session";

export const metadata: Metadata = {
  title: "Aquifert ONE",
  robots: { index: false, follow: false },
};

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const { user, ban } = await getSessionAccess();
  if (!user) redirect("/login");
  if (ban) return <SuspendedNotice email={user.email} />;
  const admin = isAdminUser(user);
  const unlocked = unlockedModules((await getAqModules()).access, { plan: user.plan, admin });
  return (
    <AppShell user={user} admin={admin} unlocked={unlocked}>
      {children}
    </AppShell>
  );
}
