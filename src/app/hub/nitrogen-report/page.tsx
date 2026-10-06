import type { Metadata } from "next";
import { HubPageHeader, Disclaimer } from "@/components/hub/kit";
import { NitrogenUsage } from "@/components/hub/nitrogen/usage-meter";
import { NitrogenWorkspace, type ReportRow } from "@/components/hub/nitrogen/workspace";
import { longDay, shortDay } from "@/components/hub/plans/shared";
import { getHubAccess } from "@/lib/aq-modules/access";
import { listNitrogenReports, nitrogenReportsThisMonth } from "@/lib/aq-modules/members";
import { limitFor } from "@/lib/aq-modules/types";
import { activePorts, getFreightDesk, nextReset } from "@/lib/freight-desk/store";
import { reportTopic } from "@/lib/nitrogen/engine";

export const metadata: Metadata = { title: "Nitrogen Report" };
export const dynamic = "force-dynamic";

export default async function NitrogenReportPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const [{ user, admin, modules }, query] = await Promise.all([getHubAccess(), searchParams]);
  const [reports, used, freight] = await Promise.all([listNitrogenReports(user), nitrogenReportsThisMonth(user), getFreightDesk()]);
  const limit = admin ? 0 : limitFor(modules.limits.nitrogenReports, user.plan);
  const keep = admin ? 0 : limitFor(modules.limits.savedReports, user.plan);
  const resets = shortDay(nextReset());
  const rows: ReportRow[] = reports.map((item) => ({
    id: item.id,
    refNo: item.refNo,
    topic: reportTopic(item.answers),
    country: item.answers?.destinationCountry ?? "",
    date: longDay(item.at),
  }));

  return (
    <div className="flex flex-col gap-5 pb-2">
      <HubPageHeader
        eyebrow="AQ ONE"
        title="Nitrogen Report"
        tip="Answer six questions on one page about destination, products, tonnage, arrival months, shipment and packing. You get a branded AQ View brief to download as a PDF or send to the desk for a quote."
        guide="nitrogen"
        description="One page. Tell the desk what you need, where it goes and how it should ship. AI synthesis builds a branded AQ View intelligence brief you can download as a PDF."
      />
      <NitrogenUsage used={used} limit={limit} resets={resets} />
      <NitrogenWorkspace
        reports={rows}
        ports={activePorts(freight)}
        limitReached={limit > 0 && used >= limit}
        startOpen={query.new === "1" && !(limit > 0 && used >= limit)}
        limitNote={`You have used all ${limit} reports on your plan this month. Your allowance resets on ${resets}, or upgrade for more.`}
        keepNote={keep > 0 ? `Your plan keeps your latest ${keep}. The oldest makes way when you go over.` : "Every report you generate is kept."}
      />
      <Disclaimer>Briefs are indicative, built from your answers and desk reference data. Prices are not quotations, and nothing in a brief is an offer or a trading recommendation.</Disclaimer>
    </div>
  );
}
