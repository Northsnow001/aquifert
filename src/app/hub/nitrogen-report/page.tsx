import type { Metadata } from "next";
import { HubPageHeader, Disclaimer } from "@/components/hub/kit";
import { NitrogenUsage } from "@/components/hub/nitrogen/usage-meter";
import { NitrogenWorkspace, type ReportRow } from "@/components/hub/nitrogen/workspace";
import { longDay, shortDay } from "@/components/hub/plans/shared";
import { getHubAccess } from "@/lib/aq-modules/access";
import { listNitrogenReports, nitrogenReportsThisMonth } from "@/lib/aq-modules/members";
import { limitFor } from "@/lib/aq-modules/types";
import { nextReset } from "@/lib/freight-desk/store";

export const metadata: Metadata = { title: "Nitrogen Report" };
export const dynamic = "force-dynamic";

export default async function NitrogenReportPage() {
  const { user, admin, modules } = await getHubAccess();
  const [reports, used] = await Promise.all([listNitrogenReports(user), nitrogenReportsThisMonth(user)]);
  const limit = admin ? 0 : limitFor(modules.limits.nitrogenReports, user.plan);
  const keep = admin ? 0 : limitFor(modules.limits.savedReports, user.plan);
  const resets = shortDay(nextReset());
  const rows: ReportRow[] = reports.map((item) => ({
    id: item.id,
    refNo: item.refNo,
    crop: item.answers?.cropType ?? "",
    country: item.answers?.destinationCountry ?? "",
    date: longDay(item.at),
  }));

  return (
    <div className="flex flex-col gap-5 pb-2">
      <HubPageHeader
        eyebrow="AQ ONE"
        title="Nitrogen Report"
        tip="Answer four short sections about delivery, volumes, crop and goals. The desk engine turns them into a tailored nitrogen sourcing and agronomy report you can print, save as PDF or send to the desk for a quote."
        guide="nitrogen"
        description="A tailored nitrogen sourcing and agronomy plan built from your delivery needs, volumes, crop and goals."
      />
      <NitrogenUsage used={used} limit={limit} resets={resets} />
      <NitrogenWorkspace
        reports={rows}
        limitReached={limit > 0 && used >= limit}
        limitNote={`You have used all ${limit} reports on your plan this month. Your allowance resets on ${resets}, or upgrade for more.`}
        keepNote={keep > 0 ? `Your plan keeps your latest ${keep}. The oldest makes way when you go over.` : "Every report you generate is kept."}
      />
      <Disclaimer>Reports are indicative, built from your answers and desk reference data. They are not an offer or agronomic advice; confirm final programmes with a qualified agronomist.</Disclaimer>
    </div>
  );
}
