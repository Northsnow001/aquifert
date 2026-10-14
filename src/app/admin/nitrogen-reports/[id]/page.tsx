import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/admin/ui";
import { Markdown } from "@/components/hub/markdown";
import { formatStamp } from "@/lib/content-types";
import { getRecord } from "@/lib/data/records";
import { NITROGEN_REPORTS } from "@/lib/data/tables";
import { buildBrief, isBriefAnswers, monthLabel, storedBrief } from "@/lib/nitrogen/engine";
import { deliveryText, EMPTY_LEGACY_ANSWERS, generateLegacyReport, PRIORITIES, type LegacyNitrogenAnswers } from "@/lib/nitrogen/legacy";
import { briefMarkdown } from "@/lib/nitrogen/render";
import { getNitrogenTemplate } from "@/lib/nitrogen/template-store";
import { AQUIBOT_MODELS } from "@/lib/aquibot";

export const dynamic = "force-dynamic";

const list = (values: string[] | undefined) => (values?.length ? values.join(", ") : "");

function writtenBy(writer: "ai" | "desk" | undefined, model: string | undefined) {
  if (writer === "ai") return `AI (${AQUIBOT_MODELS.find((item) => item.value === model)?.label ?? model ?? "Gemini"}) following the report prompt`;
  if (writer === "desk") return "Desk rules";
  return "Desk rules (before AI writing)";
}

export default async function NitrogenReportAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getRecord(NITROGEN_REPORTS, id);
  if (!report) notFound();
  const date = new Date(report.at);

  let facts: [string, string][];
  let text: string;
  let notes = "";
  if (isBriefAnswers(report.answers)) {
    const answers = report.answers;
    facts = [
      ["Prepared for", report.preparedFor ?? ""],
      ["Destination", [answers.destinationPort, answers.destinationCountry].filter(Boolean).join(", ")],
      ["Preferred origin", answers.preferredOrigin],
      ["Products", list(answers.products)],
      ["Annual tonnage (MT)", answers.annualTonnage],
      ["Preferred arrival months", answers.arrivalMonths.map((month) => monthLabel(month)).join(", ")],
      ["Shipment type", answers.shipmentType],
      ["Packing", answers.packing],
      ["Preferred cargo size (MT)", answers.cargoSize ?? ""],
      ...(answers.warehouseCapacity ? [["Warehouse capacity (MT)", answers.warehouseCapacity] as [string, string]] : []),
      ["Written by", writtenBy(report.writer, report.model)],
      ...(report.fallback ? [["Why desk wording", report.fallback] as [string, string]] : []),
      ...(report.knowledge?.length
        ? [["Knowledge used", report.knowledge.join("; ")] as [string, string]]
        : report.knowledgeNote
          ? [["Knowledge used", `None: ${report.knowledgeNote}`] as [string, string]]
          : []),
    ];
    const { design } = await getNitrogenTemplate();
    text = briefMarkdown(storedBrief(report.brief) ?? buildBrief(answers, { refNo: report.refNo, partner: report.preparedFor, date }), design);
  } else {
    const answers = (report.answers ?? {}) as Partial<LegacyNitrogenAnswers>;
    facts = [
      ["Crop", answers.cropType ?? ""],
      ["Area (ha)", answers.areaHectares ?? ""],
      ["Soil", answers.soilTexture ?? ""],
      ["Application", answers.applicationMethod ?? ""],
      ["Nitrogen sources", list(answers.nitrogenSources)],
      ["Additives", list(answers.additives)],
      ["Priority", PRIORITIES.find((item) => item.value === answers.priority)?.label ?? String(answers.priority ?? "")],
      ["Destination", [answers.destinationPort, answers.destinationCountry].filter(Boolean).join(", ")],
      ["Preferred origin", answers.preferredOrigin ?? ""],
      [answers.preferredMonths?.length || !answers.deliveryWindow ? "Preferred months" : "Delivery window", deliveryText({ preferredMonths: answers.preferredMonths ?? [], deliveryWindow: answers.deliveryWindow })],
      ["Shipment packing", answers.packaging ?? ""],
      ["Annual volume", answers.annualVolume ?? ""],
      ["Warehouse capacity", answers.warehouseCapacity ?? ""],
    ];
    text = report.answers ? generateLegacyReport({ ...EMPTY_LEGACY_ANSWERS, ...answers }, { preparedFor: report.preparedFor, date }) : report.reportMd;
    notes = answers.siteNotes ?? "";
  }

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
            {notes ? (
              <div>
                <dt className="text-[12px] text-dim">Site notes</dt>
                <dd className="whitespace-pre-wrap text-ink">{notes}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Report" meta={isBriefAnswers(report.answers) ? "The brief's text. Members see it in the AQ View layout and PDF, styled by the report template." : "Exactly as the member sees it."} />
          <div className="px-6 py-5">{text ? <Markdown text={text} /> : <p className="text-[13px] text-dim">This report has no text.</p>}</div>
        </Card>
      </div>
    </div>
  );
}
