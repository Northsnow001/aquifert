import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/admin/ui";
import { Markdown } from "@/components/hub/markdown";
import { formatStamp } from "@/lib/content-types";
import { getRecord } from "@/lib/data/records";
import { NITROGEN_REPORTS } from "@/lib/data/tables";
import { PRIORITIES } from "@/lib/nitrogen/engine";

export const dynamic = "force-dynamic";

export default async function NitrogenReportAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getRecord(NITROGEN_REPORTS, id);
  if (!report) notFound();
  const answers = report.answers ?? ({} as Partial<typeof report.answers>);
  const list = (values: string[] | undefined) => (values?.length ? values.join(", ") : "");
  const facts: [string, string][] = [
    ["Crop", answers.cropType ?? ""],
    ["Area (ha)", answers.areaHectares ?? ""],
    ["Soil", answers.soilTexture ?? ""],
    ["Application", answers.applicationMethod ?? ""],
    ["Nitrogen sources", list(answers.nitrogenSources)],
    ["Additives", list(answers.additives)],
    ["Priority", PRIORITIES.find((item) => item.value === answers.priority)?.label ?? String(answers.priority ?? "")],
    ["Destination", [answers.destinationPort, answers.destinationCountry].filter(Boolean).join(", ")],
    ["Preferred origin", answers.preferredOrigin ?? ""],
    ["Delivery window", answers.deliveryWindow ?? ""],
    ["Packaging", answers.packaging ?? ""],
    ["Annual volume", answers.annualVolume ?? ""],
    ["Warehouse capacity", answers.warehouseCapacity ?? ""],
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={report.refNo} description={`Generated ${formatStamp(report.at)} UTC for ${report.email}.`} crumbs={[{ href: "/admin/nitrogen-reports", label: "Nitrogen reports" }]} />
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden">
          <CardHeader title="What the member entered" />
          <dl className="grid gap-y-2.5 px-5 py-4 text-[13px]">
            <div>
              <dt className="text-[12px] text-dim">Member</dt>
              <dd>
                <a href={`mailto:${report.email}?subject=${encodeURIComponent(`Your nitrogen report ${report.refNo}`)}`} className="inline-flex items-center gap-1 break-all text-blue">
                  <Mail className="h-3 w-3 shrink-0" />
                  {report.email}
                </a>
              </dd>
            </div>
            {facts.map(([name, value]) => (
              <div key={name}>
                <dt className="text-[12px] text-dim">{name}</dt>
                <dd className="text-ink">{value || <span className="text-dim">Not given</span>}</dd>
              </div>
            ))}
            {answers.siteNotes ? (
              <div>
                <dt className="text-[12px] text-dim">Site notes</dt>
                <dd className="whitespace-pre-wrap text-ink">{answers.siteNotes}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Report" meta="Exactly as the member sees it." />
          <div className="px-6 py-5">{report.reportMd ? <Markdown text={report.reportMd} /> : <p className="text-[13px] text-dim">This report has no text.</p>}</div>
        </Card>
      </div>
    </div>
  );
}
