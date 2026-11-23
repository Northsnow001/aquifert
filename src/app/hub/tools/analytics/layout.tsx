import { Suspense } from "react";
import { AnalyticsTabs } from "@/components/hub/tools-tabs";
import { fmtDayYear } from "@/lib/aq-analytics/contracts";
import { dataNow } from "@/lib/aq-analytics/queries";
import { requireAqAnalytics } from "@/lib/aq-preview";

export const dynamic = "force-dynamic";

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  await requireAqAnalytics("/hub/plans/aq-analytics");
  const now = await dataNow().catch(() => "2026-09-03");
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">AQ Analytics</h1>
      <Suspense fallback={<div className="h-10 border-b border-border" />}>
        <AnalyticsTabs />
      </Suspense>
      <p className="text-[12px] text-dim">
        Freight analytics · BL data to {fmtDayYear(now)}
        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">Sample data</span>
        <span className="ml-2">Premium · daily updates</span>
      </p>
      {children}
    </div>
  );
}
