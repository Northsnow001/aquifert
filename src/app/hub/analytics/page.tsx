import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { HubPageHeader, Tag } from "@/components/hub/kit";
import { getHubAccess } from "@/lib/aq-modules/access";
import { MODULES, PLAN_LABEL } from "@/lib/aq-modules/types";

export const metadata: Metadata = { title: "AQ Analytics" };
export const dynamic = "force-dynamic";

export default async function AnalyticsHome() {
  const { modules, can } = await getHubAccess();
  return (
    <div className="flex flex-col gap-5 pb-2">
      <HubPageHeader
        eyebrow="AQ Analytics"
        title="AQ Analytics"
        description="The desk's deeper data: the full Telex wire, price series, signals, freight, balances, the weekly briefing and your price alerts."
        tip="Each module unlocks with your plan. Open a locked module to see what it covers and how to add it."
      />
      <div className="aq-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((item) => {
          const open = can(item.key);
          return (
            <Link key={item.key} href={item.href} className="aq-card aq-lift flex flex-col p-5 no-underline">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[15px] font-semibold text-ink">{item.label}</p>
                {open ? <Tag tone="green">Included</Tag> : <Tag tone="blue"><Lock className="h-3 w-3" aria-hidden /> {PLAN_LABEL[modules.access[item.key]]}</Tag>}
              </div>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-mid">{item.pitch}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-blue">
                {open ? "Open" : "See what it covers"} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
