import { HedgeEditor } from "@/components/admin/hedge-editor";
import { PageHeader } from "@/components/admin/ui";
import { deskNow, newId, type HedgeReport } from "@/lib/content-types";
import { getHubContent, sortHedge } from "@/lib/hub-content";

export const dynamic = "force-dynamic";

function blankReport(): HedgeReport {
  const today = deskNow().slice(0, 10);
  return {
    id: "",
    title: `Daily Hedge Update – ${today}`,
    date: today,
    status: "published",
    narrative: "",
    updatedAt: "",
    sections: [{ id: newId("sec"), label: "Phosphate", commodities: [] }],
  };
}

export default async function HedgeAdminPage({ searchParams }: { searchParams: Promise<{ id?: string; new?: string; paste?: string }> }) {
  const params = await searchParams;
  const reports = sortHedge((await getHubContent()).hedgeReports);
  const selected = params.new ? undefined : reports.find((item) => item.id === params.id) ?? reports[0];
  const initial = selected ?? blankReport();

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Direct Hedge Tables"
        description="The Direct Hedge | Paper Forward Curves block on the hub home page. Members see the latest published report first and can switch to earlier dates."
      />
      <HedgeEditor
        key={initial.id || "new"}
        initial={initial}
        openPaste={Boolean(params.paste)}
        reports={reports.map(({ id, title, date, status }) => ({ id, title, date, status }))}
      />
    </div>
  );
}
