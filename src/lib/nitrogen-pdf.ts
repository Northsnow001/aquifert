import { jsPDF } from "jspdf";
import { parseMarkdown, mdPlain } from "./markdown-blocks";

const NAVY: [number, number, number] = [37, 79, 118];   // #254F76
const TEAL: [number, number, number] = [110, 154, 142]; // #6E9A8E
const INK: [number, number, number] = [14, 32, 49];
const MUTED: [number, number, number] = [100, 116, 128];

/**
 * Render a nitrogen assessment report to a branded, print-ready PDF.
 * Client-side; file name: Aquifert_Nitrogen_Report_[refNo].pdf
 */
export function downloadNitrogenPdf(refNo: string, reportMd: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = 0;

  const blocks = parseMarkdown(reportMd);

  const header = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 64, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("aquifert", margin, 28);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("NITROGEN ASSESSMENT", margin, 44);
    doc.setFontSize(9);
    doc.text(refNo, pageW - margin, 28, { align: "right" });
    doc.text(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), pageW - margin, 42, { align: "right" });
    doc.setTextColor(...INK);
    y = 92;
  };

  const footer = (page: number, total: number) => {
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Aquifert, indicative desk assessment. Not an offer or agronomic advice.", margin, pageH - 24);
    doc.text(`${page} / ${total}`, pageW - margin, pageH - 24, { align: "right" });
    doc.setTextColor(...INK);
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 48) { doc.addPage(); header(); }
  };

  const wrap = (text: string, size: number, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    return doc.splitTextToSize(mdPlain(text), contentW) as string[];
  };

  header();

  for (const b of blocks) {
    if (b.type === "h1") {
      ensureSpace(40);
      doc.setFont("helvetica", "bold");
      const ls = wrap(b.text, 17, true);
      doc.text(ls, margin, y);
      y += ls.length * 20 + 6;
    } else if (b.type === "h2") {
      ensureSpace(30);
      y += 8;
      doc.setTextColor(...NAVY);
      const ls = wrap(b.text, 12.5, true);
      doc.text(ls, margin, y);
      doc.setTextColor(...INK);
      y += ls.length * 15 + 4;
      doc.setDrawColor(...TEAL);
      doc.setLineWidth(1);
      doc.line(margin, y, margin + contentW, y);
      y += 12;
    } else if (b.type === "h3") {
      ensureSpace(24);
      const ls = wrap(b.text, 11, true);
      doc.text(ls, margin, y);
      y += ls.length * 13 + 4;
    } else if (b.type === "hr") {
      ensureSpace(16);
      doc.setDrawColor(220, 226, 232);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + contentW, y);
      y += 14;
    } else if (b.type === "p") {
      const italic = b.text.startsWith("*") && b.text.endsWith("*");
      const size = italic ? 8.5 : 10;
      const ls = wrap(b.text, size);
      ensureSpace(ls.length * (size + 3.5) + 8);
      if (italic) doc.setTextColor(...MUTED);
      doc.text(ls, margin, y, { lineHeightFactor: 1.45 });
      if (italic) doc.setTextColor(...INK);
      y += ls.length * (size + 3.5) + 8;
    } else if (b.type === "table") {
      const cols = b.header.length;
      const colW = contentW / cols;
      const rowH = 20;
      const drawRow = (cells: string[], isHeader: boolean) => {
        // compute height from wrapped cells
        doc.setFontSize(9);
        doc.setFont("helvetica", isHeader ? "bold" : "normal");
        const wrapped = cells.map((c) => doc.splitTextToSize(mdPlain(c), colW - 12) as string[]);
        const h = Math.max(rowH, Math.max(...wrapped.map((w) => w.length)) * 12 + 10);
        ensureSpace(h + 4);
        if (isHeader) {
          doc.setFillColor(...NAVY);
          doc.rect(margin, y, contentW, h, "F");
          doc.setTextColor(255, 255, 255);
        }
        wrapped.forEach((w, ci) => {
          doc.text(w, margin + ci * colW + 6, y + (isHeader ? 14 : 13), { lineHeightFactor: 1.25 });
        });
        if (isHeader) doc.setTextColor(...INK);
        doc.setDrawColor(214, 222, 228);
        doc.setLineWidth(0.5);
        for (let ci = 0; ci <= cols; ci++) doc.line(margin + ci * colW, y, margin + ci * colW, y + h);
        doc.line(margin, y + h, margin + contentW, y + h);
        y += h;
      };
      drawRow(b.header, true);
      for (const r of b.rows) drawRow(r, false);
      y += 12;
    }
  }

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) { doc.setPage(p); footer(p, total); }

  doc.save(`Aquifert_Nitrogen_Report_${refNo}.pdf`);
}
