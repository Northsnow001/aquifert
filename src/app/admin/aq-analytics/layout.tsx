import { SuiteNav } from "@/components/admin/aq-analytics/suite-nav";
import { fmtDayYear } from "@/lib/aq-analytics/contracts";
import { dataNow } from "@/lib/aq-analytics/queries";

export default async function AqAnalyticsLayout({ children }: { children: React.ReactNode }) {
  const now = await dataNow().catch(() => "2026-09-03");
  return (
    <div className="mx-auto max-w-7xl">
      <SuiteNav dataNow={fmtDayYear(now)} sample />
      {children}
    </div>
  );
}
