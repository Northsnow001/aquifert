/**
 * Library PDF artefact (brief §6.4): on publish, render a brand-template PDF
 * of the report from its structured body and store it beside staff uploads
 * (outside the web root), so every published report has both a web page and
 * a downloadable file. Rendering is best-effort: a failure here must never
 * block a publish.
 */
import { jsPDF } from "jspdf";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type * as s from "../../db/schema";

const UPLOAD_DIR = "uploads/library";
const NAVY: [number, number, number] = [37, 79, 118];
const TEAL: [number, number, number] = [63, 167, 150];
const SLATE: [number, number, number] = [71, 85, 105];

const DISCLAIMER =
  "This report is provided for information only. It does not constitute a price assessment, an offer, or trading advice. Prices are indicative and may be delayed. Verify independently before trading.";

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export async function renderReportPdf(
  report: s.LibraryReport,
  sources: s.LibraryReportSource[]
): Promise<{ filePath: string; fileName: string; fileSizeBytes: number; fileMime: string }> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  let y = 0;

  const newPageIfNeeded = (need: number) => {
    if (y + need > pageH - 64) {
      doc.addPage();
      y = 64;
    }
  };

  /* Brand header band */
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 84, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("aquifert", margin, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Library, market reports and research from the Aquifert desk", margin, 56);
  doc.setFillColor(...TEAL);
  doc.rect(0, 84, pageW, 3, "F");
  y = 118;

  /* Meta */
  doc.setTextColor(...TEAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const typeLabel = report.reportType.replace(/_/g, " ").toUpperCase();
  const weekLabel = report.weekNumber && report.year ? ` · WEEK ${report.weekNumber}, ${report.year}` : "";
  doc.text(`${typeLabel}${weekLabel}`, margin, y);
  y += 22;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(19);
  const titleLines = doc.splitTextToSize(report.title, pageW - margin * 2) as string[];
  doc.text(titleLines, margin, y);
  y += titleLines.length * 24 + 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE);
  const meta = [
    report.periodStart && report.periodEnd ? `${fmtDate(report.periodStart)} to ${fmtDate(report.periodEnd)}` : null,
    report.authorName ?? "Aquifert Desk",
    report.publishedAt ? `Published ${fmtDate(report.publishedAt)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  doc.text(meta, margin, y);
  y += 16;

  if (report.origin === "ai_generated") {
    doc.setFontSize(8.5);
    const aiNote = doc.splitTextToSize(
      "This report was drafted by AI from the sources listed at the end and reviewed by the Aquifert desk before publication. AI-drafted · desk-reviewed.",
      pageW - margin * 2
    ) as string[];
    doc.text(aiNote, margin, y);
    y += aiNote.length * 11 + 8;
  }
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 22;

  /* Sections */
  const body = (report.body ?? []) as s.LibraryBodySection[];
  for (const sec of body) {
    newPageIfNeeded(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(sec.heading, margin, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    for (const para of sec.paragraphs) {
      const lines = doc.splitTextToSize(para, pageW - margin * 2) as string[];
      for (const line of lines) {
        newPageIfNeeded(15);
        doc.text(line, margin, y);
        y += 15;
      }
      y += 7;
    }
    y += 10;
  }

  /* Sources */
  if (sources.length > 0) {
    newPageIfNeeded(70);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text("Sources", margin, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    for (const [i, src] of sources.entries()) {
      const line = `[${i + 1}] ${src.sourceTitle}, ${src.sourceType.replace(/_/g, " ")}${
        src.sourceDate ? `, ${fmtDate(src.sourceDate)}` : ""
      }`;
      const lines = doc.splitTextToSize(line, pageW - margin * 2) as string[];
      for (const l of lines) {
        newPageIfNeeded(12);
        doc.text(l, margin, y);
        y += 12;
      }
      y += 2;
    }
    y += 10;
  }

  /* Disclaimer at the foot of the last page */
  newPageIfNeeded(50);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 16;
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  const disc = doc.splitTextToSize(DISCLAIMER, pageW - margin * 2) as string[];
  doc.text(disc, margin, y);

  const buf = Buffer.from(doc.output("arraybuffer"));
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = `${report.slug}.pdf`;
  const filePath = path.join(UPLOAD_DIR, `${report.id}.pdf`);
  await fs.writeFile(filePath, buf);
  return { filePath, fileName, fileSizeBytes: buf.length, fileMime: "application/pdf" };
}
