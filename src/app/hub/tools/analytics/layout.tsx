import { Suspense } from "react";
import { ToolsHeading, ToolsTabs } from "@/components/hub/tools-tabs";
import { fmtDayYear } from "@/lib/aq-analytics/contracts";
import { dataNow } from "@/lib/aq-analytics/queries";

export const dynamic = "force-dynamic";

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const now = await dataNow().catch(() => "2026-09-03");
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <ToolsHeading />
      <Suspense fallback={<div className="h-10 border-b border-border" />}>
        <ToolsTabs />
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
