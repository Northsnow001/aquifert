import type { Metadata } from "next";
import { GuideBrowser, type GuideLimits } from "@/components/hub/guide-browser";
import { getFreightDesk } from "@/lib/freight-desk/store";
import { getAqModules } from "@/lib/aq-modules/store";
import { getHubContent } from "@/lib/hub-content";
import { getNetbackDesk } from "@/lib/netback-desk/store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "User Guide" };

export default async function GuidePage() {
  const [user, freight, netback, content, modules] = await Promise.all([getSession(), getFreightDesk(), getNetbackDesk(), getHubContent(), getAqModules()]);
  const tiers = (settings: { limitCore: number; limitGrowth: number; limitEnterprise: number }) => ({
    core: settings.limitCore,
    growth: settings.limitGrowth,
    enterprise: settings.limitEnterprise,
  });
  const limits: GuideLimits = [
    { label: "Freight calculations", ...tiers(freight.settings) },
    { label: "Netback calculations", ...tiers(netback.settings) },
    { label: "Aquibot questions", ...tiers(content.aquibot.settings) },
    { label: "Nitrogen Reports", ...modules.limits.nitrogenReports },
  ];
  return <GuideBrowser limits={limits} plan={user?.plan ?? null} />;
}
