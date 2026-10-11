import type { NitrogenBrief } from "@/lib/nitrogen/engine";
import { briefHeader, sectionHeading } from "@/lib/nitrogen/render";
import { DEFAULT_DESIGN, hexToRgb, textScale, visibleSections, type BriefDesign, type BriefSectionKey } from "@/lib/nitrogen/template";

type RGB = [number, number, number];

const BORDER: RGB = [226, 232, 240];
const WHITE: RGB = [255, 255, 255];
const META: RGB = [210, 222, 232];

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

/** Renders the brief as a branded A4 PDF in the design's colours: header band, disclaimer strip, accent-ruled sections, headed tables and commentary boxes. */
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
  const BODY_SIZE = 9.5 * scale;
  const LINE = 13.5 * scale;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const contentW = pageW - margin * 2;
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
    const bandH = first ? 112 : 60;
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, bandH, "F");
    if (logo) doc.addImage(logo, "PNG", margin, first ? 18 : 14, 20 * LOGO.ratio, 20);
    else {
      color(TEAL);
      font(8, "bold");
      doc.text("AQUIFERT ONE HUB", margin, first ? 30 : 26);
    }
    font(8);
    color(META);
    doc.text(brief.refNo, pageW - margin, first ? 32 : 28, { align: "right" });
    if (!first) {
      doc.text(head.title.split(" | ")[0].toUpperCase(), margin, 48);
      y = bandH + 26;
      color(BODY);
      return;
    }
    color(WHITE);
    font(17, "bold");
    doc.text((doc.splitTextToSize(head.title, contentW) as string[])[0], margin, 64);
    font(8.5, "bold");
    color(META);
    doc.text([head.subtitle, head.preparedBy].filter(Boolean).join("  |  "), margin, 82);
    font(8);
    doc.text([brief.week, brief.date, head.confidential].filter(Boolean).join("  |  "), margin, 95);

    if (!head.disclaimer) {
      y = bandH + 26;
      color(BODY);
      return;
    }
    const lines = wrap(head.disclaimer, 7.5, "italic");
    const stripH = lines.length * 10 + 12;
    doc.setFillColor(...AMBER_LIGHT);
    doc.rect(0, bandH, pageW, stripH, "F");
    color(AMBER);
    doc.text(lines, margin, bandH + 14, { lineHeightFactor: 1.3 });
    y = bandH + stripH + 26;
    color(BODY);
  };

  const ensure = (needed: number) => {
    if (y + needed > pageH - 56) {
      doc.addPage();
      header(false);
    }
  };

  const heading = (title: string) => {
    ensure(48);
    y += 6;
    color(NAVY);
    font(9, "bold");
    doc.text(title.toUpperCase(), margin, y);
    y += 6;
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(1.2);
    doc.line(margin, y, margin + contentW, y);
    y += 16;
    color(BODY);
  };

  const paragraph = (text: string) => {
    const lines = wrap(text, BODY_SIZE, "normal");
    ensure(lines.length * LINE + 8);
    doc.text(lines, margin, y, { lineHeightFactor: 1.4 });
    y += lines.length * LINE + 8;
  };

  const table = (head: string[], rows: string[][], firstShare: number) => {
    const firstW = contentW * firstShare;
    const widths = [firstW, ...Array(head.length - 1).fill((contentW - firstW) / (head.length - 1))];
    if (head.length === 3) {
      widths[1] = contentW - firstW - 64;
      widths[2] = 64;
    }
    const xs = widths.reduce<number[]>((acc, _w, i) => [...acc, i === 0 ? margin : acc[i - 1] + widths[i - 1]], []);
    const row = (cells: string[], kind: "head" | "even" | "odd") => {
      font(8.5, kind === "head" ? "bold" : "normal");
      const wrapped = cells.map((cell, i) => doc.splitTextToSize(kind === "head" ? cell.toUpperCase() : cell, widths[i] - 14) as string[]);
      const h = Math.max(20, Math.max(...wrapped.map((lines) => lines.length)) * 11.5 + 10);
      ensure(h + 2);
      if (kind === "head") doc.setFillColor(...NAVY);
      else if (kind === "odd") doc.setFillColor(...TEAL_LIGHT);
      if (kind !== "even") doc.rect(margin, y, contentW, h, "F");
      wrapped.forEach((lines, i) => {
        if (kind === "head") color(WHITE);
        else color(i === 0 ? NAVY : BODY);
        font(8.5, kind === "head" || i === 0 ? "bold" : "normal");
        doc.text(lines, xs[i] + 7, y + 13.5, { lineHeightFactor: 1.3 });
      });
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.5);
      doc.line(margin, y + h, margin + contentW, y + h);
      y += h;
    };
    row(head, "head");
    rows.forEach((cells, index) => row(cells, index % 2 ? "odd" : "even"));
    color(BODY);
    y += 14;
  };

  const aqView = (items: { label?: string; text: string }[]) => {
    const labelW = 64;
    const pad = 10;
    for (const item of items) {
      const text = item.label ? `${item.label}. ${item.text}` : item.text;
      const lines = wrap(text, BODY_SIZE, "italic", contentW - labelW - pad * 2);
      const h = Math.max(40, lines.length * LINE + pad * 2);
      ensure(h + 6);
      doc.setFillColor(...TEAL);
      doc.rect(margin, y, labelW, h, "F");
      doc.setFillColor(...TEAL_LIGHT);
      doc.rect(margin + labelW, y, contentW - labelW, h, "F");
      color(WHITE);
      font(8, "bold");
      const tag = doc.splitTextToSize(label, labelW - 8) as string[];
      doc.text(tag, margin + labelW / 2, y + h / 2 + 3 - ((tag.length - 1) * 9) / 2, { align: "center", lineHeightFactor: 1.1 });
      color(NAVY);
      font(BODY_SIZE, "italic");
      doc.text(lines, margin + labelW + pad, y + pad + BODY_SIZE, { lineHeightFactor: 1.4 });
      y += h + 6;
    }
    color(BODY);
    y += 8;
  };

  header(true);

  const sections: Record<BriefSectionKey, (title: string) => void> = {
    requirement: (title) => {
      heading(sectionHeading(title, brief));
      table(["Parameter", "Value"], brief.requirement, 0.32);
    },
    pulse: (title) => {
      heading(sectionHeading(title, brief));
      table(["Market", `${brief.week} View`, "Signal"], brief.pulse.map((row) => [row.market, row.view, row.signal]), 0.22);
    },
    position: (title) => {
      heading(sectionHeading(title, brief));
      aqView(brief.position.map((text) => ({ text })));
    },
    products: (title) => {
      for (const item of brief.products) {
        heading(sectionHeading(title, brief, item.name));
        paragraph(item.note);
        paragraph(item.view);
      }
    },
    logistics: (title) => {
      heading(sectionHeading(title, brief));
      brief.logistics.forEach(paragraph);
    },
    recommendations: (title) => {
      heading(sectionHeading(title, brief));
      aqView(brief.recommendations);
    },
  };
  for (const section of visibleSections(design)) sections[section.key](section.heading);

  const quoteText = !design.quote.hidden ? design.quote.text.trim() : "";
  if (quoteText) {
    const quote = wrap(`\u201C${quoteText}\u201D`, BODY_SIZE, "italic", contentW - 80);
    const quoteH = quote.length * LINE + 36;
    // The sign-off quote is decorative: drop it rather than start a page that holds nothing else.
    if (y + quoteH <= pageH - 44) {
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + contentW, y);
      y += 20;
      color(MUTED);
      doc.text(quote, pageW / 2, y, { align: "center", lineHeightFactor: 1.4 });
      y += quote.length * LINE;
      font(8.5);
      if (design.quote.source.trim()) doc.text(design.quote.source.trim(), pageW / 2, y, { align: "center" });
    }
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
    font(7.5);
    color(MUTED);
    if (head.footer) doc.text(head.footer.replace(/ \| /g, "  |  "), margin, pageH - 22);
    doc.text(`Page ${page} of ${pages}`, pageW - margin, pageH - 22, { align: "right" });
  }

  doc.save(`AQ_View_Nitrogen_Brief_${brief.refNo}.pdf`);
}
