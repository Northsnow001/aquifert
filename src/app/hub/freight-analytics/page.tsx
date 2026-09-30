import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockedScreen } from "@/components/hub/locked-screen";
import { getHubAccess } from "@/lib/aq-modules/access";

export const metadata: Metadata = { title: "Freight Analytics" };
export const dynamic = "force-dynamic";

export default async function FreightAnalyticsPage() {
  const { user, modules, can } = await getHubAccess();
  if (can("freight-analytics")) redirect("/hub/analytics/freight");
  return <LockedScreen module="freight-analytics" required={modules.access["freight-analytics"]} plan={user.plan} />;
}
