import type { NitrogenBrief } from "@/lib/nitrogen/engine";
import { briefHeader, callItems, productParagraphs, pulseTable, sectionHasContent, sectionHeading } from "@/lib/nitrogen/render";
import { DEFAULT_DESIGN, hexToRgb, textScale, visibleSections, type BriefDesign, type BriefSectionKey } from "@/lib/nitrogen/template";

type RGB = [number, number, number];

const BORDER: RGB = [214, 222, 230];
const WHITE: RGB = [255, 255, 255];
const META: RGB = [196, 210, 224];

const LOGO = { src: "/brand/logo-v2-light.png", ratio: 814 / 214 };

async function logoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(LOGO.src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Renders the brief as a branded A4 PDF in the design's colours, laid out like the desk's AQ View notes: header band,
 * disclaimer strip, accent-ruled sections, a compact drivers table, justified commentary and one AQ View box for the call.
 */
export async function downloadBriefPdf(brief: NitrogenBrief, design: BriefDesign = DEFAULT_DESIGN) {
  const [{ jsPDF }, logo] = await Promise.all([import("jspdf"), design.showLogo ? logoDataUrl() : Promise.resolve(null)]);
  const NAVY = hexToRgb(design.colors.header);
  const TEAL = hexToRgb(design.colors.accent);
  const TEAL_LIGHT = hexToRgb(design.colors.accentLight);
  const AMBER = hexToRgb(design.colors.noticeText);
  const AMBER_LIGHT = hexToRgb(design.colors.notice);
  const BODY = hexToRgb(design.colors.body);
  const MUTED = hexToRgb(design.colors.muted);
  const head = briefHeader(brief, design);
  const label = (design.viewLabel.trim() || DEFAULT_DESIGN.viewLabel).toUpperCase();
  const scale = textScale(design);
  const BODY_SIZE = 9 * scale;
  const LINE = 12.4 * scale;
  const CELL_SIZE = 7.6 * scale;
  const CELL_LINE = 9.6 * scale;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentW = pageW - margin * 2;
  const bottom = pageH - 50;
  let y = 0;

  const color = (rgb: RGB) => doc.setTextColor(...rgb);
  const font = (size: number, style: "normal" | "bold" | "italic" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };
  const wrap = (text: string, size: number, style: "normal" | "bold" | "italic", width = contentW) => {
    font(size, style);
    return doc.splitTextToSize(text, width) as string[];
  };

  const header = (first: boolean) => {
    const bandH = first ? 96 : 40;
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, bandH, "F");
    if (!first) {
      color(TEAL);
      font(7, "bold");
      doc.text("AQUIFERT ONE HUB", margin, 24);
      color(META);
      font(7);
      doc.text(`${head.title.split(" | ")[0].toUpperCase()}  |  ${brief.refNo}`, pageW - margin, 24, { align: "right" });
      y = bandH + 26;
      color(BODY);
      return;
    }
    if (logo) doc.addImage(logo, "PNG", margin, 16, 16 * LOGO.ratio, 16);
    else {
      color(TEAL);
      font(7.5, "bold");
      doc.text("AQUIFERT ONE HUB", margin, 27);
    }
    font(7);
    color(META);
    doc.text(brief.refNo, pageW - margin, 27, { align: "right" });
    color(WHITE);
    font(15, "bold");
    doc.text((doc.splitTextToSize(head.title, contentW) as string[])[0], margin, 52);
    font(8.5);
    color(META);
    doc.text([head.subtitle, head.preparedBy].filter(Boolean).join("  |  "), margin, 68);
    font(7);
    doc.text([brief.week, brief.date, head.confidential].filter(Boolean).join("  |  "), margin, 81);

    if (!head.disclaimer) {
      y = bandH + 24;
      color(BODY);
      return;
    }
    const lines = wrap(head.disclaimer, 7, "italic");
    const stripH = lines.length * 9 + 11;
    doc.setFillColor(...AMBER_LIGHT);
    doc.rect(0, bandH, pageW, stripH, "F");
    color(AMBER);
    doc.text(lines, margin, bandH + 13, { lineHeightFactor: 1.25 });
    y = bandH + stripH + 22;
    color(BODY);
  };

  const ensure = (needed: number) => {
    if (y + needed > bottom) {
      doc.addPage();
      header(false);
    }
  };

  const heading = (title: string) => {
    ensure(44);
    y += 4;
    color(NAVY);
    font(8.5, "bold");
    doc.text(title.toUpperCase(), margin, y);
    y += 4;
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(1);
    doc.line(margin, y, margin + contentW, y);
    y += 12;
    color(BODY);
  };

  /** Justified body text, split across pages line by line when a paragraph runs over. */
  const paragraph = (text: string, style: "normal" | "italic" = "normal") => {
    const lines = wrap(text, BODY_SIZE, style);
    let index = 0;
    while (index < lines.length) {
      ensure(LINE * Math.min(2, lines.length - index));
      const fit = Math.max(1, Math.floor((bottom - y) / LINE));
      const chunk = lines.slice(index, index + fit);
      color(BODY);
      font(BODY_SIZE, style);
      doc.text(chunk, margin, y, { align: "justify", maxWidth: contentW, lineHeightFactor: LINE / BODY_SIZE });
      y += chunk.length * LINE;
      index += chunk.length;
    }
    y += 5;
  };

  const table = (cols: string[], rows: string[][], shares: number[]) => {
    const widths = shares.map((share) => contentW * share);
    const xs = widths.reduce<number[]>((acc, _w, i) => [...acc, i === 0 ? margin : acc[i - 1] + widths[i - 1]], []);
    const row = (cells: string[], kind: "head" | "even" | "odd") => {
      const wrapped = cells.map((cell, i) => wrap(cell, CELL_SIZE, kind === "head" ? "bold" : "normal", widths[i] - 10));
      const h = Math.max(kind === "head" ? 16 : 18, Math.max(...wrapped.map((lines) => lines.length)) * CELL_LINE + 7);
      ensure(h + 2);
      if (kind === "head") doc.setFillColor(...NAVY);
      else if (kind === "odd") doc.setFillColor(...TEAL_LIGHT);
      if (kind !== "even") doc.rect(margin, y, contentW, h, "F");
      wrapped.forEach((lines, i) => {
        color(kind === "head" ? WHITE : i === 0 ? NAVY : BODY);
        font(CELL_SIZE, kind === "head" ? "bold" : "normal");
        doc.text(lines, xs[i] + 5, y + CELL_SIZE + 3.5, { lineHeightFactor: CELL_LINE / CELL_SIZE });
      });
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.4);
      doc.line(margin, y + h, margin + contentW, y + h);
      y += h;
    };
    row(cols, "head");
    rows.forEach((cells, index) => row(cells, index % 2 ? "odd" : "even"));
    color(BODY);
    y += 12;
  };

  const aqView = (items: { label?: string; text: string }[]) => {
    const labelW = 62;
    const pad = 9;
    for (const item of items) {
      const text = item.label ? `${item.label}. ${item.text}` : item.text;
      const width = contentW - labelW - pad * 2;
      const lines = wrap(text, BODY_SIZE, "italic", width);
      const h = Math.max(36, lines.length * LINE + pad * 2 - 2);
      ensure(h + 6);
      doc.setFillColor(...TEAL);
      doc.rect(margin, y, labelW, h, "F");
      doc.setFillColor(...TEAL_LIGHT);
      doc.rect(margin + labelW, y, contentW - labelW, h, "F");
      color(WHITE);
      font(7.5, "bold");
      const tag = doc.splitTextToSize(label, labelW - 8) as string[];
      doc.text(tag, margin + labelW / 2, y + h / 2 + 2.5 - ((tag.length - 1) * 8.5) / 2, { align: "center", lineHeightFactor: 1.1 });
      color(NAVY);
      font(BODY_SIZE, "italic");
      doc.text(lines, margin + labelW + pad, y + pad + BODY_SIZE - 1, { align: "justify", maxWidth: width, lineHeightFactor: LINE / BODY_SIZE });
      y += h + 5;
    }
    color(BODY);
    y += 4;
  };

  header(true);

  const sections: Record<BriefSectionKey, (title: string) => void> = {
    pulse: (title) => {
      heading(sectionHeading(title, brief));
      const { head: cols, rows } = pulseTable(brief);
      table(cols, rows, cols.length === 4 ? [0.17, 0.3, 0.33, 0.2] : [0.2, 0.62, 0.18]);
    },
    products: (title) => {
      for (const item of brief.products) {
        heading(sectionHeading(title, brief, item.name));
        productParagraphs(item).forEach((text) => paragraph(text));
      }
    },
    macro: (title) => {
      heading(sectionHeading(title, brief));
      (brief.macro ?? []).forEach((text) => paragraph(text));
    },
    position: (title) => {
      heading(sectionHeading(title, brief));
      brief.position.forEach((text) => paragraph(text));
    },
    logistics: (title) => {
      heading(sectionHeading(title, brief));
      brief.logistics.forEach((text) => paragraph(text));
    },
    call: (title) => {
      heading(sectionHeading(title, brief));
      aqView(callItems(brief));
      if (brief.risk) paragraph(brief.risk);
    },
    requirement: (title) => {
      heading(sectionHeading(title, brief));
      table(["Parameter", "Value"], brief.requirement, [0.32, 0.68]);
    },
    recommendations: (title) => {
      heading(sectionHeading(title, brief));
      aqView(brief.recommendations);
    },
  };
  for (const section of visibleSections(design)) if (sectionHasContent(section.key, brief, design)) sections[section.key](section.heading);

  const quoteText = !design.quote.hidden ? design.quote.text.trim() : "";
  if (quoteText) {
    const quote = wrap(`\u201C${quoteText}\u201D`, 8.5, "italic", contentW - 80);
    const quoteH = quote.length * 11 + 34;
    // The sign-off quote is decorative: drop it rather than start a page that holds nothing else.
    if (y + quoteH <= bottom) {
      y += 4;
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + contentW, y);
      y += 15;
      color(MUTED);
      doc.text(quote, pageW / 2, y, { align: "center", lineHeightFactor: 1.3 });
      y += quote.length * 11;
      font(8, "italic");
      if (design.quote.source.trim()) doc.text(design.quote.source.trim(), pageW / 2, y, { align: "center" });
    }
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.8);
    doc.line(margin, pageH - 34, pageW - margin, pageH - 34);
    font(7, "italic");
    color(MUTED);
    if (head.footer) doc.text(head.footer.replace(/ \| /g, "  |  "), margin, pageH - 23);
    font(7);
    doc.text(pages > 1 ? `Page ${page} of ${pages}` : `Page ${page}`, pageW - margin, pageH - 23, { align: "right" });
  }

  doc.save(`AQ_View_Nitrogen_Brief_${brief.refNo}.pdf`);
}
