import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HubPageHeader } from "@/components/hub/kit";
import { Markdown } from "@/components/hub/markdown";
import { ReportActions } from "@/components/hub/nitrogen/report-actions";
import { longDay } from "@/components/hub/plans/shared";
import { getHubAccess } from "@/lib/aq-modules/access";
import { getNitrogenReport } from "@/lib/aq-modules/members";
import { EMPTY_ANSWERS, orderDeskHref } from "@/lib/nitrogen/engine";

export const metadata: Metadata = { title: "Nitrogen Report" };
export const dynamic = "force-dynamic";

const DOC = [
  "text-[15.5px] text-mid",
  "[&>p:first-child]:pt-0 [&>p:first-child]:text-[22px] [&>p:first-child]:leading-tight [&>p:first-child]:tracking-[-0.02em]",
  "[&_table]:text-[14.5px] [&_thead]:bg-navy-700 [&_th]:py-2 [&_th]:text-white [&_td]:py-2",
  "[&_td:first-child]:font-medium [&_td:first-child]:text-ink [&_tbody_tr:nth-child(even)]:bg-s2/70",
  "[&_hr]:my-4 [print-color-adjust:exact]",
].join(" ");

export default async function NitrogenReportView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getHubAccess();
  const report = await getNitrogenReport(user, id);
  if (!report) notFound();

  const where = [report.answers?.cropType, report.answers?.destinationCountry].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-5 pb-2">
      <div className="print:hidden">
        <Link href="/hub/nitrogen-report" className="mb-3 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-mid no-underline hover:text-blue">
          <ArrowLeft className="h-4 w-4" /> All reports
        </Link>
        <HubPageHeader
          eyebrow="Nitrogen Report"
          title={<span className="font-mono text-[24px] md:text-[28px]">{report.refNo}</span>}
          description={`${where ? `${where} · ` : ""}Prepared ${longDay(report.at)}`}
          actions={<ReportActions id={report.id} refNo={report.refNo} quoteHref={orderDeskHref(report.answers ?? EMPTY_ANSWERS)} />}
        />
      </div>

      <article className="aq-card mx-auto w-full max-w-3xl overflow-hidden print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="flex items-center justify-between gap-4 bg-gradient-to-r from-navy-700 to-navy-500 px-6 py-4 text-white [print-color-adjust:exact] sm:px-10">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-white/70">Aquifert Trading Desk</p>
            <p className="text-[16.5px] font-semibold">Nitrogen assessment</p>
          </div>
          <p className="font-mono text-[13.5px] font-semibold text-white/85">{report.refNo}</p>
        </header>
        <div className="px-6 py-7 sm:px-10 sm:py-9">
          <Markdown text={report.reportMd} className={DOC} />
        </div>
      </article>

      <p className="mx-auto max-w-3xl text-center text-[13px] text-dim print:hidden">
        Printing opens your browser&rsquo;s print window. Choose &ldquo;Save as PDF&rdquo; as the destination to keep a copy.
      </p>
    </div>
  );
}
