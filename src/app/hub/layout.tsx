import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/hub/app-shell";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Aquifert ONE",
  robots: { index: false, follow: false },
};

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  return <AppShell user={user}>{children}</AppShell>;
}
